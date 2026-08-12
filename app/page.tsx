'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Trash2, Volume2, Sparkles, Image as ImageIcon, X, Loader2 } from 'lucide-react';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string, image?: string}>>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize audio on first user interaction (for mobile)
  const initAudio = () => {
    if (!audioInitialized) {
      console.log('Initializing audio context for mobile');
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
      try {
        const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4SbOsVaAAAAAAD/+xDEAAAAAAAAAAAAAAAAAAAAAABYaW5nAAAADwAAAAIAAAOEALu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v//////////////////////////////////////////////////////////////////wAAAABMYXZjNTguMTMAAAAAAAAAAAAAAAAAAA==');
        silentAudio.play().catch(e => console.log('Silent audio play failed:', e));
      } catch (e) {
        console.log('Silent audio creation failed:', e);
      }
      setAudioInitialized(true);
    }
  };

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem('isida-memory');
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        } else {
          localStorage.removeItem('isida-memory');
        }
      } catch (e) {
        localStorage.removeItem('isida-memory');
      }
    }

    const handleFirstInteraction = () => {
      initAudio();
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction);

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';

      let finalTranscript = '';
      let silenceTimer: NodeJS.Timeout;

      recognitionRef.current.onresult = (event: any) => {
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimText = event.results[i][0].transcript;
          }
        }

        setTranscript(finalTranscript + interimText);

        clearTimeout(silenceTimer);

        if (finalTranscript.trim()) {
          silenceTimer = setTimeout(() => {
            if (finalTranscript.trim()) {
              recognitionRef.current?.stop();
              setIsListening(false);
              sendMessage(finalTranscript.trim());
              finalTranscript = '';
            }
          }, 800);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 6 * 24; // ~6 lines
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  }, [textInput]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    initAudio();

    const newMessage: any = { role: 'user', content: text };
    if (selectedImage) {
      newMessage.image = selectedImage;
    }

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setTranscript('');
    setTextInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage = { role: 'assistant', content: data.response };
      const updatedMessages = [...newMessages, aiMessage];

      setMessages(updatedMessages);

      try {
        localStorage.setItem('isida-memory', JSON.stringify(updatedMessages));
      } catch (storageErr) {
        console.warn('Failed to save to localStorage:', storageErr);
      }

      await speak(data.response);
    } catch (err) {
      console.error('Send message error:', err);
      if (!(err instanceof DOMException && err.name === 'QuotaExceededError')) {
        alert('Ошибка: ' + err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() || selectedImage) {
      sendMessage(textInput.trim() || 'Что на изображении?');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const speak = async (text: string) => {
    console.log('Starting TTS for:', text);
    setIsSpeaking(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      console.log('TTS response status:', response.status);

      if (response.ok) {
        const audioBlob = await response.blob();
        console.log('Audio blob size:', audioBlob.size);

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.preload = 'auto';
        audio.volume = 1.0;

        audio.onended = () => {
          console.log('Audio ended');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.oncanplaythrough = () => {
          console.log('Audio ready to play');
        };

        console.log('Starting audio playback');

        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log('Audio playing successfully');
            return;
          }
        } catch (playError) {
          console.error('Audio play promise rejected:', playError);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        }
      }
    } catch (err) {
      console.error('ElevenLabs error, using browser fallback:', err);
    }

    // Browser TTS fallback
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        return new Promise<SpeechSynthesisVoice[]>((resolve) => {
          let voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve(voices);
          } else {
            window.speechSynthesis.onvoiceschanged = () => {
              voices = window.speechSynthesis.getVoices();
              resolve(voices);
            };
            setTimeout(() => {
              resolve(window.speechSynthesis.getVoices());
            }, 1000);
          }
        });
      };

      try {
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 100));

        const voices = await loadVoices();
        console.log('Available voices:', voices.length);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const femaleVoice = voices.find(v =>
          v.lang.startsWith('ru') &&
          (v.name.toLowerCase().includes('female') ||
           v.name.toLowerCase().includes('woman') ||
           v.name.toLowerCase().includes('yelda') ||
           v.name.toLowerCase().includes('milena'))
        ) || voices.find(v => v.lang.startsWith('ru') && !v.name.toLowerCase().includes('male'));

        if (femaleVoice) {
          utterance.voice = femaleVoice;
          console.log('Using voice:', femaleVoice.name);
        } else {
          console.log('Using default voice');
        }

        utterance.onstart = () => {
          console.log('Speech started');
        };

        utterance.onend = () => {
          console.log('Speech ended');
          setIsSpeaking(false);
        };

        utterance.onerror = (e) => {
          console.error('Speech error:', e);
          setIsSpeaking(false);
        };

        const maxDuration = text.length * 100;
        const timeoutId = setTimeout(() => {
          console.log('Speech timeout reached');
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }, maxDuration);

        utterance.onend = () => {
          clearTimeout(timeoutId);
          console.log('Speech ended normally');
          setIsSpeaking(false);
        };

        console.log('Speaking with browser TTS');
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('TTS setup error:', err);
        setIsSpeaking(false);
      }
    } else {
      console.error('speechSynthesis not available');
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    console.log('Stopping speech');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      setIsListening(false);
    }

    setIsSpeaking(false);
  };

  const startListening = () => {
    initAudio();
    if (recognitionRef.current && !isListening) {
      stopSpeaking();
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Recognition start error:', e);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('isida-memory');
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden font-mono flex flex-col">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/background.jpg"
          alt="Background"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Floating orbs - reduced for mobile */}
      {mounted && (
        <>
          <motion.div
            className="absolute w-64 h-64 md:w-96 md:h-96 bg-blue-500 rounded-full blur-3xl opacity-20 hidden md:block"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{ top: '10%', left: '10%' }}
          />
          <motion.div
            className="absolute w-64 h-64 md:w-96 md:h-96 bg-purple-500 rounded-full blur-3xl opacity-20 hidden md:block"
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{ bottom: '10%', right: '10%' }}
          />
        </>
      )}

      {/* Animated particles */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full"
              animate={{
                x: [Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)],
                y: [Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000), Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 10 + Math.random() * 20,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              style={{
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
              }}
            />
          ))}
        </div>
      )}

      {/* Scan line effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)',
          height: '100px'
        }}
        animate={{
          y: ['0vh', '100vh']
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Main content - flex column layout */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-cyan-400/20 bg-black/30 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <motion.h1
              className="text-2xl md:text-3xl font-black tracking-wider"
              style={{
                background: 'linear-gradient(to right, #00f5ff, #00d4ff, #0084ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ISIDA
            </motion.h1>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-950/20">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-xs font-bold text-cyan-300 tracking-wide">AI</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearHistory}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-full border border-red-500/30 text-xs font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ОЧИСТИТЬ</span>
          </motion.button>
        </motion.div>

        {/* Messages Area - flex-1 takes remaining space */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="mb-4"
              >
                <Sparkles className="w-16 h-16 text-cyan-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-cyan-300 mb-2">Привет! Я ISIDA</h2>
              <p className="text-cyan-400/70 text-sm">Напиши сообщение или используй голосовой ввод</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 text-white border border-cyan-400/30 shadow-lg shadow-cyan-500/20'
                        : 'bg-gradient-to-br from-gray-900 to-gray-800 text-cyan-100 border border-cyan-400/20 shadow-lg'
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="mb-2 max-w-full h-auto rounded-lg" />
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-cyan-100 border border-cyan-400/20 shadow-lg p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-sm">Думаю...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Panel at Bottom */}
        <div
          className="flex-shrink-0 border-t border-cyan-400/20 bg-black/40 backdrop-blur-xl"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          }}
        >
          {/* Status Bar */}
          {(isListening || isSpeaking) && (
            <div className="px-4 py-2 border-b border-cyan-400/10">
              <AnimatePresence mode="wait">
                {isListening && (
                  <motion.div
                    key="listening"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 bg-cyan-400 rounded-full"
                    />
                    <span className="text-cyan-300 text-sm font-bold">Слушаю...</span>
                  </motion.div>
                )}
                {isSpeaking && (
                  <motion.div
                    key="speaking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300 text-sm font-bold">Говорю...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Image Preview */}
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-2 border-b border-cyan-400/10"
            >
              <div className="relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border-2 border-cyan-500" />
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Input Form */}
          <form onSubmit={handleTextSubmit} className="px-4 py-3">
            <div className="flex items-end gap-2">
              {/* Image Button */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 p-2.5 bg-black/40 hover:bg-black/60 border border-cyan-400/30 rounded-full transition-all"
              >
                <ImageIcon className="w-5 h-5 text-cyan-400" />
              </motion.button>

              {/* Text Input - auto-expanding */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Напишите сообщение"
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-2.5 bg-black/40 border border-cyan-400/30 rounded-2xl text-cyan-100 placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 resize-none overflow-y-auto text-sm"
                  style={{
                    minHeight: '42px',
                    maxHeight: '144px',
                  }}
                />
              </div>

              {/* Microphone Button */}
              <motion.button
                type="button"
                onClick={isListening ? stopListening : startListening}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 p-2.5 rounded-full transition-all ${
                  isListening
                    ? 'bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/30'
                    : 'bg-black/40 hover:bg-black/60 border border-cyan-400/30'
                }`}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-cyan-400'}`} />
              </motion.button>

              {/* Send Button */}
              <motion.button
                type="submit"
                disabled={isLoading || (!textInput.trim() && !selectedImage)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 p-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* iOS Safari keyboard fix */
        @supports (-webkit-touch-callout: none) {
          .min-h-screen {
            min-height: -webkit-fill-available;
          }
        }
      `}</style>
    </div>
  );
}

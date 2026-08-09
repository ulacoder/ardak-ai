'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Trash2, Volume2, Sparkles, Zap, Brain, Cpu, Image as ImageIcon, X } from 'lucide-react';

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

  // Initialize audio on first user interaction (for mobile)
  const initAudio = () => {
    if (!audioInitialized) {
      console.log('Initializing audio context for mobile');
      // Create and play silent audio to unlock audio context
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
      // Also try to create Audio element
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

    // Initialize audio on any touch/click for mobile
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
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    initAudio(); // Ensure audio is ready before response

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

      // Try to save to localStorage, ignore quota errors
      try {
        localStorage.setItem('isida-memory', JSON.stringify(updatedMessages));
      } catch (storageErr) {
        console.warn('Failed to save to localStorage (quota exceeded):', storageErr);
        // Silently continue - the conversation still works
      }

      // Speak response with ElevenLabs
      await speak(data.response);
    } catch (err) {
      console.error('Send message error:', err);
      alert('Ошибка: ' + err);
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
      // Try ElevenLabs first
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

        // Mobile audio setup
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

        // Try to play with error handling for mobile
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log('Audio playing successfully');
            return; // Exit if successful
          }
        } catch (playError) {
          console.error('Audio play promise rejected:', playError);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          // Fall through to browser TTS
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
            // Timeout for mobile
            setTimeout(() => {
              resolve(window.speechSynthesis.getVoices());
            }, 1000);
          }
        });
      };

      try {
        // Cancel any existing speech first
        window.speechSynthesis.cancel();

        // Small delay for mobile Safari
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

        // Fallback timeout
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

    // Stop HTML5 Audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Stop recognition if running
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      setIsListening(false);
    }

    // Immediately reset state
    setIsSpeaking(false);
  };

  const startListening = () => {
    initAudio();
    if (recognitionRef.current && !isListening) {
      stopSpeaking(); // Stop any ongoing speech first
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
    <div className="min-h-screen bg-black relative overflow-hidden font-mono">
      {/* Animated grid background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950 opacity-60" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(147, 51, 234, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Floating orbs - reduced for mobile performance */}
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

      {/* Animated particles - reduced count for mobile */}
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

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8">
        {/* Header with floating icons */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Brain className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Cpu className="w-8 h-8 text-purple-400" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-8 h-8 text-blue-400" />
            </motion.div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative w-28 h-28 mb-6"
          >
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/30">
              <Image src="/logo.jpg" alt="Isida" fill className="object-cover" priority sizes="112px" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-6xl md:text-7xl font-black mb-2 tracking-wider"
            style={{
              background: 'linear-gradient(to right, #00f5ff, #00d4ff, #00a8ff, #0084ff, #00d4ff, #00f5ff)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradient 3s linear infinite'
            }}
          >
            ISIDA
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3 px-6 py-2 rounded-full border border-cyan-400/30 bg-cyan-950/20 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </motion.div>
            <p className="text-lg font-bold text-cyan-300 tracking-widest">AI ASSISTANT</p>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Voice Button */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            className="relative mb-8"
          >
            {/* Hexagon rings */}
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-cyan-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.8, 0, 0.8],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-purple-400"
                  animate={{
                    scale: [1, 2, 1],
                    opacity: [0.8, 0, 0.8],
                    rotate: [360, 180, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </>
            )}

            {isSpeaking && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                    animate={{
                      scale: [1, 1.3 + i * 0.2],
                      opacity: [0.6, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3
                    }}
                  />
                ))}
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isSpeaking ? stopSpeaking : (isListening ? stopListening : startListening)}
              className="relative w-48 h-48 md:w-56 md:h-56 rounded-full transition-all duration-500"
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, #f43f5e, #ec4899, #8b5cf6)'
                  : isSpeaking
                  ? 'linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)'
                  : 'linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)',
                boxShadow: isListening
                  ? '0 0 60px rgba(236, 72, 153, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
                  : isSpeaking
                  ? '0 0 60px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
                  : '0 0 60px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="absolute inset-0 rounded-full border-4 border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {isListening ? (
                    <motion.div
                      key="listening"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MicOff className="w-24 h-24 md:w-28 md:h-28 text-white drop-shadow-2xl" />
                    </motion.div>
                  ) : isSpeaking ? (
                    <motion.div
                      key="speaking"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Volume2 className="w-24 h-24 md:w-28 md:h-28 text-white drop-shadow-2xl" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Mic className="w-24 h-24 md:w-28 md:h-28 text-white drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          </motion.div>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-16 mb-6 flex items-center"
          >
            <AnimatePresence mode="wait">
              {isListening && (
                <motion.div
                  key="listening-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 px-6 py-3 rounded-full border border-cyan-400/50 bg-cyan-950/30 backdrop-blur-sm"
                >
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"
                  />
                  <span className="text-cyan-300 text-xl font-bold tracking-wider">СЛУШАЮ...</span>
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div
                  key="speaking-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 px-6 py-3 rounded-full border border-blue-400/50 bg-blue-950/30 backdrop-blur-sm"
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"
                    />
                  ))}
                  <span className="text-blue-300 text-xl font-bold tracking-wider">ГОВОРЮ...</span>
                </motion.div>
              )}
              {!isListening && !isSpeaking && transcript && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-6 py-3 rounded-full border border-gray-400/30 bg-gray-950/30 backdrop-blur-sm"
                >
                  <span className="text-gray-300 text-lg">{transcript}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Text Input Form */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-2xl mt-8"
          >
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 relative inline-block"
              >
                <img src={selectedImage} alt="Preview" className="h-24 w-24 object-cover rounded-xl border-2 border-cyan-500" />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            <form onSubmit={handleTextSubmit} className="flex gap-3">
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
                className="px-4 py-4 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-cyan-400/30 rounded-full transition-all"
              >
                <ImageIcon className="w-5 h-5 text-cyan-400" />
              </motion.button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Напиши сообщение..."
                disabled={isLoading}
                className="flex-1 px-6 py-4 bg-black/40 backdrop-blur-xl border border-cyan-400/30 rounded-full text-cyan-100 placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50"
              />
              <motion.button
                type="submit"
                disabled={isLoading || (!textInput.trim() && !selectedImage)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
              >
                {isLoading ? '...' : 'ОТПРАВИТЬ'}
              </motion.button>
            </form>
          </motion.div>

          {/* Conversation */}
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-3xl"
            >
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.slice(-8).map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 text-white border border-cyan-400/30 shadow-lg shadow-cyan-500/30'
                              : 'bg-gradient-to-br from-gray-900 to-gray-800 text-cyan-100 border border-cyan-400/20 shadow-lg'
                          }`}
                        >
                          {msg.image && (
                            <img src={msg.image} alt="User upload" className="mb-2 max-w-full h-auto rounded-lg" />
                          )}
                          <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearHistory}
                className="mt-4 mx-auto flex items-center gap-2 px-6 py-3 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-sm text-red-400 rounded-full border border-red-500/30 transition-all font-bold tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                ОЧИСТИТЬ
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

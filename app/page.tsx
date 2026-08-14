'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Trash2, Volume2, Sparkles, Image as ImageIcon, X, Loader2, Copy, Check } from 'lucide-react';
import { useChatHistory } from './hooks/useChatHistory';
import ChatSidebar from './components/ChatSidebar';

export default function Home() {
  const {
    chats,
    currentChatId,
    currentChat,
    createNewChat,
    deleteChat,
    switchChat,
    updateChatMessages,
    clearAllHistory,
  } = useChatHistory();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string, image?: string}>>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Sync messages with current chat
  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    } else {
      setMessages([]);
    }
  }, [currentChatId, currentChat]);

  // Initialize audio on first user interaction (for mobile)
  const initAudio = useCallback(() => {
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
  }, [audioInitialized]);

  useEffect(() => {
    setMounted(true);

    // Create initial chat if none exists
    if (chats.length === 0) {
      createNewChat();
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
  }, [chats.length, createNewChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 6 * 24; // ~6 lines
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  }, [textInput]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    initAudio();

    // Create new chat if none exists
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

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

      // Save to chat history
      if (chatId) {
        updateChatMessages(chatId, updatedMessages);
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
  }, [currentChatId, createNewChat, messages, selectedImage, initAudio, updateChatMessages]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() || selectedImage) {
      sendMessage(textInput.trim() || 'Что на изображении?');
    }
  }, [textInput, selectedImage, sendMessage]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const speak = useCallback(async (text: string) => {
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
  }, []);

  const stopSpeaking = useCallback(() => {
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
  }, [isListening]);

  const startListening = useCallback(() => {
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
  }, [isListening, initAudio, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const clearHistory = useCallback(() => {
    if (currentChatId) {
      deleteChat(currentChatId);
    }
  }, [currentChatId, deleteChat]);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white relative overflow-hidden font-sans flex">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={createNewChat}
        onSelectChat={switchChat}
        onDeleteChat={deleteChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white">

      {/* Main content - flex column layout */}
      <div className="relative z-10 flex flex-col h-[100dvh]">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white"
        >
          <div className="flex items-center gap-3 ml-12">
            <Image
              src="/logo.jpeg"
              alt="Isida AI Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              ISIDA
            </h1>
            <span className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
              AI
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearHistory}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистить</span>
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
              <Image
                src="/logo.jpeg"
                alt="Isida AI"
                width={80}
                height={80}
                className="mb-4 rounded-full"
              />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Привет! Я ISIDA</h2>
              <p className="text-gray-500 text-sm">Напиши сообщение или используй голосовой ввод</p>
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
                    className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="mb-2 max-w-full h-auto rounded-lg" />
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300 text-xs font-medium transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>
                    )}
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
              <div className="bg-gray-100 text-gray-900 border border-gray-200 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm">Думаю...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Panel at Bottom */}
        <div
          className="flex-shrink-0 border-t border-gray-200 bg-white"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          }}
        >
          {/* Status Bar */}
          {(isListening || isSpeaking) && (
            <div className="px-4 py-2 border-b border-gray-100">
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
                      className="w-2 h-2 bg-emerald-600 rounded-full"
                    />
                    <span className="text-gray-700 text-sm font-medium">Слушаю...</span>
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
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-700 text-sm font-medium">Говорю...</span>
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
              className="px-4 py-2 border-b border-gray-100"
            >
              <div className="relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
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
                className="flex-shrink-0 p-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-gray-700" />
              </motion.button>

              {/* Text Input - auto-expanding */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onFocus={() => {
                    // Scroll to bottom when keyboard opens on mobile
                    setTimeout(() => {
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Напишите сообщение"
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 resize-none overflow-y-auto text-sm"
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
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-gray-700'}`} />
              </motion.button>

              {/* Send Button */}
              <motion.button
                type="submit"
                disabled={isLoading || (!textInput.trim() && !selectedImage)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 p-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
      {/* End Main content */}
      </div>
      {/* End Main Chat Area */}
    </div>
  );
}

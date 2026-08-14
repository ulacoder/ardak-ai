import { useState, useEffect, useRef, useCallback } from 'react';
import { Chat, Message } from '../types';

const STORAGE_KEY = 'isida-chat-history';
const SAVE_DEBOUNCE_MS = 500;

export function useChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setChats(parsed.chats || []);
        setCurrentChatId(parsed.currentChatId || null);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    isMountedRef.current = true;
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chats, currentChatId]);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => {
      const updatedChats = prev.filter(chat => chat.id !== chatId);

      if (currentChatId === chatId) {
        setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
      }

      return updatedChats;
    });
  }, [currentChatId]);

  const switchChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  const updateChatMessages = useCallback((chatId: string, messages: Message[]) => {
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === chatId) {
          // Auto-generate title from first user message
          const firstUserMessage = messages.find(m => m.role === 'user');
          const title = firstUserMessage
            ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
            : 'Новый чат';

          return {
            ...chat,
            messages,
            title,
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );
  }, []);

  const clearAllHistory = useCallback(() => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getCurrentChat = useCallback(() => {
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  return {
    chats,
    currentChatId,
    currentChat: getCurrentChat(),
    createNewChat,
    deleteChat,
    switchChat,
    updateChatMessages,
    clearAllHistory,
  };
}

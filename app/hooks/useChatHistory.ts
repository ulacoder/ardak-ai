import { useState, useEffect } from 'react';
import { Chat, Message } from '../types';

const STORAGE_KEY = 'isida-chat-history';

export function useChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

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
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }, [chats, currentChatId]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const deleteChat = (chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);

    if (currentChatId === chatId) {
      setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
    }
  };

  const switchChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const updateChatMessages = (chatId: string, messages: Message[]) => {
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
  };

  const clearAllHistory = () => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === currentChatId) || null;
  };

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

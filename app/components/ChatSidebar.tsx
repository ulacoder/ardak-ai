'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Trash2, X, Menu } from 'lucide-react';
import { Chat } from '../types';
import { useState } from 'react';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export default function ChatSidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Toggle Button - visible on all screens */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 left-4 z-50 p-2 bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg"
      >
        <Menu className="w-5 h-5 text-cyan-400" />
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-black/90 backdrop-blur-xl border-r border-cyan-400/20 z-50 flex flex-col shadow-2xl"
          >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-400/20">
          <h2 className="text-lg font-bold text-cyan-300">История чатов</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-cyan-400/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-cyan-400" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <motion.button
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-white font-bold shadow-lg shadow-cyan-500/20"
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span>Новый чат</span>
          </motion.button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          <AnimatePresence>
            {chats.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-cyan-400/50 text-sm mt-8"
              >
                Нет чатов
              </motion.div>
            ) : (
              chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`group relative p-3 rounded-lg cursor-pointer border transition-all ${
                    currentChatId === chat.id
                      ? 'bg-cyan-600/20 border-cyan-400/50'
                      : 'bg-black/40 border-cyan-400/10 hover:border-cyan-400/30 hover:bg-black/60'
                  }`}
                  onClick={() => {
                    onSelectChat(chat.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-cyan-100 text-sm font-medium truncate">
                        {chat.title}
                      </p>
                      <p className="text-cyan-400/50 text-xs mt-1">
                        {formatDate(chat.updatedAt)}
                      </p>
                      <p className="text-cyan-400/40 text-xs">
                        {chat.messages.length} сообщений
                      </p>
                    </div>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded border border-red-500/30 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

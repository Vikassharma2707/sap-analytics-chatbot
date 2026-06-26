'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, Sun, Moon, BarChart3 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { motion } from 'framer-motion';

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    theme,
    createConversation,
    setActiveConversation,
    deleteConversation,
    toggleTheme,
  } = useChatStore();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
          <BarChart3 size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">SAP Analytics</p>
          <p className="text-xs text-gray-500">AI Chatbot</p>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3">
        <button
          onClick={() => createConversation()}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
            bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-gray-600 px-3 py-2">No conversations yet</p>
        )}
        {conversations.map((conv) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors
              ${conv.id === activeConversationId
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
            onClick={() => setActiveConversation(conv.id)}
          >
            <MessageSquare size={14} className="flex-shrink-0" />
            <span className="flex-1 text-xs truncate">{conv.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-500">S/4HANA Connected</span>
        <button onClick={toggleTheme} className="text-gray-500 hover:text-gray-300 transition-colors">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  );
}

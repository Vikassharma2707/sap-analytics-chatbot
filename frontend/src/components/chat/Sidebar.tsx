'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, BarChart3, Activity, Clock } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { motion } from 'framer-motion';

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    setActiveConversation,
    deleteConversation,
  } = useChatStore();

  const today = conversations.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const older = conversations.filter((c) => !today.includes(c));

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl
            flex items-center justify-center shadow-lg shadow-blue-900/40">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">SAP Analytics</p>
            <p className="text-[11px] text-gray-500 leading-tight">AI Assistant</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-900">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">S/4HANA Connected</span>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3">
        <button
          onClick={() => createConversation()}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
            bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
            text-white text-sm font-medium transition-all shadow-md shadow-blue-900/30
            hover:shadow-blue-900/50 active:scale-[0.98]"
        >
          <Plus size={16} />
          New Conversation
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-3">
            <MessageSquare size={28} className="text-gray-700" />
            <p className="text-xs text-gray-600">No conversations yet.<br />Ask your first question!</p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Clock size={11} className="text-gray-600" />
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Today</span>
                </div>
                {today.map((conv) => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeConversationId}
                    onSelect={setActiveConversation}
                    onDelete={deleteConversation}
                  />
                ))}
              </div>
            )}
            {older.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Clock size={11} className="text-gray-600" />
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Earlier</span>
                </div>
                {older.map((conv) => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeConversationId}
                    onSelect={setActiveConversation}
                    onDelete={deleteConversation}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Activity size={12} className="text-blue-600" />
          <span>Read-only · Data is live</span>
        </div>
      </div>
    </aside>
  );
}

function ConvItem({
  conv, active, onSelect, onDelete,
}: {
  conv: { id: string; title: string };
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
        ${active
          ? 'bg-blue-600/20 border border-blue-700/40 text-blue-300'
          : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200 border border-transparent'}`}
      onClick={() => onSelect(conv.id)}
    >
      <MessageSquare size={13} className={`flex-shrink-0 ${active ? 'text-blue-400' : 'text-gray-600'}`} />
      <span className="flex-1 text-xs truncate">{conv.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-0.5 rounded"
      >
        <Trash2 size={11} />
      </button>
    </motion.div>
  );
}

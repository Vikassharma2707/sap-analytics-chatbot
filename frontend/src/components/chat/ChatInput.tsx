'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask about your SAP data…' }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-gray-800 border border-gray-700 rounded-2xl
      focus-within:border-blue-500 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm
          resize-none outline-none leading-relaxed py-1.5 max-h-40"
      />
      <div className="flex items-center gap-1 pb-1">
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="w-9 h-9 flex items-center justify-center rounded-xl
            bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}

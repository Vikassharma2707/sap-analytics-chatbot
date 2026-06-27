'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, BarChart2, TrendingUp, RefreshCw } from 'lucide-react';
import { BitsHeader } from '@/components/layout/BitsHeader';
import { SapConnectionPanel } from '@/components/layout/SapConnectionPanel';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useChatStore } from '@/store/chatStore';
import { chatApi } from '@/services/api';
import toast, { Toaster } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const QUICK_PROMPTS = [
  'Top 10 customers by revenue this year',
  'Show sales trend for last 12 months',
  'Open vendor invoices',
  'Inventory aging analysis',
  'Compare sales this year vs last year',
];

export default function Home() {
  const { getActiveMessages, isLoading, setLoading, activeConversationId, createConversation } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = getActiveMessages();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message: string) => {
    const text = message.trim();
    if (!text || isLoading) return;
    setInput('');
    if (!activeConversationId) createConversation();

    const loadingId = uuidv4();
    useChatStore.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === s.activeConversationId
          ? {
              ...c,
              messages: [
                ...c.messages,
                { id: uuidv4(), role: 'user' as const, content: text, timestamp: new Date() },
                { id: loadingId, role: 'assistant' as const, content: '', timestamp: new Date(), isLoading: true },
              ],
            }
          : c
      ),
    }));

    setLoading(true);
    try {
      const { result } = await chatApi.sendMessage(text, activeConversationId || undefined);
      const summary = result.insights?.summary || 'Here is your analytics result.';
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === s.activeConversationId
            ? { ...c, messages: c.messages.map((m) => m.id === loadingId ? { ...m, isLoading: false, content: summary, result } : m) }
            : c
        ),
      }));
    } catch (err) {
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === s.activeConversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === loadingId
                    ? { ...m, isLoading: false, content: 'Sorry, I encountered an error processing your request.',
                        result: { error: String(err), followup_questions: [], cds_views_used: [], execution_steps: [], execution_time_ms: 0 } }
                    : m
                ),
              }
            : c
        ),
      }));
      toast.error('Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-bits-bg text-white overflow-hidden">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#0d1f35', color: '#f9fafb', border: '1px solid #1e3a5f' }
      }} />

      <BitsHeader />

      <div className="flex flex-1 overflow-hidden">
        <SapConnectionPanel />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">

            {/* Chat panel */}
            <div className={`bg-bits-panel border border-bits-border rounded-2xl flex flex-col overflow-hidden ${hasMessages ? 'flex-1' : ''}`}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-bits-border">
                <div className="w-2 h-2 rounded-full bg-bits-accent" />
                <span className="text-xs font-bold text-bits-accent uppercase tracking-widest">AI Chat Assistant</span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!hasMessages ? (
                  <WelcomeState onSelect={handleSend} />
                ) : (
                  <div className="max-w-3xl mx-auto space-y-2">
                    {messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} onFollowUp={handleSend} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="px-5 pb-4 pt-2 border-t border-bits-border">
                <div className="flex items-center gap-3 bg-bits-deep border border-bits-border2 rounded-xl px-4 py-2.5 focus-within:border-bits-accent transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
                    placeholder="Type your question here..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent text-sm text-white placeholder-bits-muted outline-none"
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-bits-btn hover:bg-bits-btnhov disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {isLoading
                      ? <RefreshCw size={16} className="text-white animate-spin" />
                      : <Send size={16} className="text-white" />}
                  </button>
                </div>
                <p className="text-xs text-bits-muted text-center mt-2">
                  AI-generated insights may not always be 100% accurate. Please validate critical business decisions.
                </p>
              </div>
            </div>

            {/* Results panel — empty state only */}
            {!hasMessages && (
              <div className="bg-bits-panel border border-bits-border rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-bits-border">
                  <div className="w-2 h-2 rounded-full bg-bits-accent" />
                  <span className="text-xs font-bold text-bits-accent uppercase tracking-widest">Results</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <BarChart2 size={64} className="text-bits-border" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-bits-hover flex items-center justify-center">
                      <TrendingUp size={11} className="text-bits-accent" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-white">Your results will appear here</p>
                    <p className="text-sm text-bits-muted mt-1">Ask a question to get started.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between px-5 py-2 bg-bits-deep border-t border-bits-border text-xs text-bits-muted">
            <span>© 2025 BITS Pilani WILP. All rights reserved.</span>
            <span>Powered by SAP S/4 HANA &nbsp;|&nbsp; Built with <span className="text-red-500">♥</span> for Analytics</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function WelcomeState({ onSelect }: { onSelect: (p: string) => void }) {
  return (
    <div className="flex items-start gap-5 py-2">
      <div className="w-20 h-20 rounded-2xl border border-bits-border2 flex items-center justify-center flex-shrink-0 shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1a3a6b, #0d2448)' }}>
        <Bot size={40} className="text-bits-accent" />
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-white mb-1">
          Hello! I&apos;m your SAP AI Analytics Assistant
        </h2>
        <p className="text-sm text-bits-text mb-4 leading-relaxed">
          Ask me anything about your business data. I can help you with sales analysis, finance insights,
          inventory status, procurement, production and much more.
        </p>
        <p className="text-xs font-semibold text-bits-muted uppercase tracking-widest mb-2">
          Try asking something like:
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <motion.button
              key={p}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(p)}
              className="px-3.5 py-1.5 text-sm rounded-lg border border-bits-border2 bg-bits-deep text-bits-accent hover:bg-bits-hover hover:text-white hover:border-bits-accent transition-all"
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

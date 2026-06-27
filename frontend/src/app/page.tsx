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

const C = {
  bg:     '#071224',
  panel:  '#0d1f35',
  deep:   '#0a1628',
  border: '#1e3a5f',
  border2:'#2a4f7a',
  accent: '#4a9eff',
  text:   '#7a9cc4',
  muted:  '#4a6080',
  btn:    '#1a5fb4',
};

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
                    ? { ...m, isLoading: false, content: 'Sorry, I encountered an error.',
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
    <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', color: 'white' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: C.panel, color: '#f9fafb', border: `1px solid ${C.border}` }
      }} />

      <BitsHeader />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SapConnectionPanel />

        {/* Main content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, gap: 12 }}>

            {/* Chat panel */}
            <div style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flex: hasMessages ? 1 : '0 0 auto',
            }}>
              {/* Section label */}
              <div style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  AI Chat Assistant
                </span>
              </div>

              {/* Messages / welcome */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {!hasMessages ? (
                  <WelcomeState onSelect={handleSend} />
                ) : (
                  <div style={{ maxWidth: 780, margin: '0 auto' }}>
                    {messages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} onFollowUp={handleSend} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: C.deep, border: `1px solid ${C.border2}`, borderRadius: 12, padding: '8px 16px',
                }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
                    placeholder="Type your question here..."
                    disabled={isLoading}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 14, color: 'white',
                    }}
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isLoading}
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: C.btn, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: (!input.trim() || isLoading) ? 0.4 : 1,
                      flexShrink: 0,
                    }}>
                    {isLoading
                      ? <RefreshCw size={16} color="white" className="animate-spin" />
                      : <Send size={16} color="white" />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>
                  AI-generated insights may not always be 100% accurate. Please validate critical business decisions.
                </p>
              </div>
            </div>

            {/* Results empty state */}
            {!hasMessages && (
              <div style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16,
                flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                <div style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Results
                  </span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <BarChart2 size={64} color={C.border} />
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TrendingUp size={11} color={C.accent} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Your results will appear here</p>
                    <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Ask a question to get started.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer style={{
            background: C.deep, borderTop: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 20px', fontSize: 11, color: C.muted, flexShrink: 0,
          }}>
            <span>© 2025 BITS Pilani WILP. All rights reserved.</span>
            <span>Powered by SAP S/4 HANA &nbsp;|&nbsp; Built with <span style={{ color: '#ef4444' }}>♥</span> for Analytics</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function WelcomeState({ onSelect }: { onSelect: (p: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '8px 0' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
        background: 'linear-gradient(135deg, #1a3a6b, #0d2448)',
        border: '1px solid #2a4f7a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px #00000044',
      }}>
        <Bot size={40} color="#4a9eff" />
      </div>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 6 }}>
          Hello! I&apos;m your SAP AI Analytics Assistant
        </h2>
        <p style={{ fontSize: 14, color: '#7a9cc4', lineHeight: 1.6, marginBottom: 16 }}>
          Ask me anything about your business data. I can help you with sales analysis, finance insights,
          inventory status, procurement, production and much more.
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Try asking something like:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_PROMPTS.map((p) => (
            <motion.button
              key={p}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(p)}
              style={{
                padding: '6px 14px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
                background: '#0a1628', border: '1px solid #2a4f7a',
                color: '#7ac5ff', transition: 'all 0.15s',
              }}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

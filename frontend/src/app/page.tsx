'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BitsHeader } from '@/components/layout/BitsHeader';
import { SapConnectionPanel } from '@/components/layout/SapConnectionPanel';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useChatStore } from '@/store/chatStore';
import { useSettingsStore } from '@/store/settingsStore';
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
  const { system, connection } = useSettingsStore();
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
    <div style={{ background: '#071224', display: 'flex', flexDirection: 'column', height: '100vh', color: 'white', overflow: 'hidden' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1f35', color: '#f9fafb', border: '1px solid #1e3a5f' } }} />
      <BitsHeader />

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SapConnectionPanel />

        {/* Right side */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Scrollable content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* AI Chat Panel */}
            <div style={{
              background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: 16,
              display: 'flex', flexDirection: 'column',
              minHeight: hasMessages ? 400 : 'auto',
              flex: hasMessages ? '1 1 0' : '0 0 auto',
            }}>
              {/* Label */}
              <div style={{ borderBottom: '1px solid #1e3a5f', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4a9eff' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4a9eff', textTransform: 'uppercase', letterSpacing: 2 }}>
                  AI Chat Assistant
                </span>
              </div>

              {/* Welcome or messages */}
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

              {/* Input bar */}
              <div style={{ borderTop: '1px solid #1e3a5f', padding: '12px 20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#0a1628', border: '1px solid #2a4f7a', borderRadius: 12, padding: '8px 16px',
                }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
                    placeholder="Type your question here..."
                    disabled={isLoading}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'white' }}
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isLoading}
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#1a5fb4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: !input.trim() || isLoading ? 0.4 : 1, flexShrink: 0,
                      fontSize: 16,
                    }}>
                    {isLoading ? '⏳' : '➤'}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#4a6080', textAlign: 'center', marginTop: 8, margin: '8px 0 0' }}>
                  AI-generated insights may not always be 100% accurate. Please validate critical business decisions.
                </p>
              </div>
            </div>

            {/* Results panel — welcome state only */}
            {!hasMessages && (
              <div style={{
                background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: 16,
                minHeight: 240, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ borderBottom: '1px solid #1e3a5f', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4a9eff' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4a9eff', textTransform: 'uppercase', letterSpacing: 2 }}>Results</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
                  <div style={{ fontSize: 56, opacity: 0.3 }}>📊</div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: '0 0 6px' }}>Your results will appear here</p>
                    <p style={{ fontSize: 13, color: '#4a6080', margin: 0 }}>Ask a question to get started.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer style={{
            background: '#0a1628', borderTop: '1px solid #1e3a5f',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 20px', fontSize: 11, color: '#4a6080', flexShrink: 0,
          }}>
            <span>© 2025 BITS Pilani WILP. All rights reserved.</span>
            <span>
              System: <strong style={{ color: '#4a9eff' }}>{system.sid}</strong> | Client: <strong style={{ color: '#4a9eff' }}>{system.client}</strong>
              &nbsp;&nbsp;
              <span style={{ color: connection.state === 'connected' ? '#4ade80' : '#f87171' }}>
                ● {connection.state === 'connected' ? 'Connected' : 'Not Connected'}
              </span>
              &nbsp;|&nbsp; Built with <span style={{ color: '#ef4444' }}>♥</span> for Analytics
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function WelcomeState({ onSelect }: { onSelect: (p: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Robot avatar */}
      <div style={{
        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
        background: 'linear-gradient(135deg, #1a3a6b, #0d2448)',
        border: '1px solid #2a4f7a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40,
      }}>🤖</div>

      <div style={{ flex: 1 }}>
        <h2 style={{ color: 'white', fontWeight: 700, fontSize: 20, margin: '0 0 8px' }}>
          Hello! I&apos;m your SAP AI Analytics Assistant
        </h2>
        <p style={{ color: '#7a9cc4', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
          Ask me anything about your business data. I can help you with sales analysis, finance insights,
          inventory status, procurement, production and much more.
        </p>
        <p style={{ color: '#4a6080', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 10px' }}>
          Try asking something like:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onSelect(p)}
              style={{
                padding: '7px 14px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
                background: '#0a1628', border: '1px solid #2a4f7a', color: '#7ac5ff',
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

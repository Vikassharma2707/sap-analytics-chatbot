'use client';

import React, { useEffect, useRef } from 'react';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { SuggestionPrompts } from '@/components/chat/SuggestionPrompts';
import { useChatStore } from '@/store/chatStore';
import { chatApi } from '@/services/api';
import toast, { Toaster } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const {
    getActiveMessages,
    addUserMessage,
    addAssistantMessage,
    isLoading,
    setLoading,
    activeConversationId,
    createConversation,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = getActiveMessages();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!activeConversationId) createConversation();
    addUserMessage(message);

    // Add loading assistant message
    const loadingId = uuidv4();
    const { conversations, activeConversationId: convId } = useChatStore.getState();
    // We'll use addAssistantMessage with isLoading flag via store
    useChatStore.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === s.activeConversationId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: loadingId,
                  role: 'assistant' as const,
                  content: '',
                  timestamp: new Date(),
                  isLoading: true,
                },
              ],
            }
          : c
      ),
    }));

    setLoading(true);
    try {
      const { result } = await chatApi.sendMessage(
        message,
        activeConversationId || undefined
      );

      // Replace loading message with result
      const summary = result.insights?.summary || 'Here is your analytics result.';
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === s.activeConversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === loadingId
                    ? { ...m, isLoading: false, content: summary, result }
                    : m
                ),
              }
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
                    ? {
                        ...m,
                        isLoading: false,
                        content: 'Sorry, I encountered an error processing your request.',
                        result: { error: String(err), followup_questions: [], cds_views_used: [], execution_steps: [], execution_time_ms: 0 },
                      }
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

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' } }} />
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <SuggestionPrompts onSelect={handleSend} />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onFollowUp={handleSend}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 px-4 py-4 bg-gray-950">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isLoading} />
            <p className="text-xs text-gray-600 text-center mt-2">
              Connected to SAP S/4HANA · Data is read-only · Powered by Claude
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

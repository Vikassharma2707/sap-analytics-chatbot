import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Conversation, PipelineResult } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  theme: 'light' | 'dark';

  // Actions
  createConversation: () => string;
  setActiveConversation: (id: string) => void;
  addUserMessage: (content: string) => string;
  addAssistantMessage: (content: string, result?: PipelineResult) => void;
  updateLoadingMessage: (id: string, result: PipelineResult) => void;
  setLoading: (loading: boolean) => void;
  toggleTheme: () => void;
  deleteConversation: (id: string) => void;
  getActiveConversation: () => Conversation | null;
  getActiveMessages: () => Message[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isLoading: false,
      theme: 'dark',

      createConversation: () => {
        const id = uuidv4();
        const conv: Conversation = {
          id,
          title: 'New Conversation',
          createdAt: new Date(),
          messages: [],
        };
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addUserMessage: (content) => {
        const { activeConversationId, conversations, createConversation } = get();
        const convId = activeConversationId || createConversation();
        const msgId = uuidv4();
        const msg: Message = {
          id: msgId,
          role: 'user',
          content,
          timestamp: new Date(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, msg],
                  title: c.messages.length === 0 ? content.slice(0, 60) : c.title,
                }
              : c
          ),
          activeConversationId: convId,
        }));
        return msgId;
      },

      addAssistantMessage: (content, result) => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;
        const msg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content,
          timestamp: new Date(),
          result,
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === activeConversationId
              ? { ...c, messages: [...c.messages, msg] }
              : c
          ),
        }));
      },

      updateLoadingMessage: (id, result) => {
        const { activeConversationId } = get();
        if (!activeConversationId) return;
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === id ? { ...m, isLoading: false, result } : m
                  ),
                }
              : c
          ),
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeConversationId:
            s.activeConversationId === id ? null : s.activeConversationId,
        })),

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) || null;
      },

      getActiveMessages: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId)?.messages || [];
      },
    }),
    { name: 'sap-chatbot-store', partialize: (s) => ({ conversations: s.conversations, theme: s.theme }) }
  )
);

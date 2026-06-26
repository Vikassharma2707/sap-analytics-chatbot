import axios from 'axios';
import type { PipelineResult, SuggestionCategory, ExportFormat } from '@/types';

// On Vercel the backend is co-deployed at /api/v1 (same origin — no CORS issues).
// Locally it proxies to FastAPI on :8000.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token on every request
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const chatApi = {
  sendMessage: async (
    message: string,
    conversationId?: string,
    drillContext?: Record<string, unknown>
  ): Promise<{ result: PipelineResult; conversation_id: string }> => {
    const { data } = await apiClient.post('/chat/message', {
      message,
      conversation_id: conversationId,
      drill_context: drillContext,
    });
    return data;
  },

  getSuggestions: async (): Promise<{ suggestions: SuggestionCategory[] }> => {
    const { data } = await apiClient.get('/chat/suggestions');
    return data;
  },

  exportData: async (
    format: ExportFormat,
    title: string,
    records: Record<string, unknown>[],
    kpis: Record<string, unknown>,
    insights: object
  ): Promise<Blob> => {
    const { data } = await apiClient.post(
      '/chat/export',
      { format, title, records, kpis, insights },
      { responseType: 'blob' }
    );
    return data;
  },
};

export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const { data } = await apiClient.post('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
};

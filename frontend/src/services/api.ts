/**
 * API Service
 * Handles all HTTP requests to the backend with Clerk authentication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE = '/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add Clerk auth token
api.interceptors.request.use(async (config) => {
  // Get Clerk token if available
  try {
    const Clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
    if (Clerk?.session) {
      const token = await Clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // No Clerk session, continue without token
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to sign-in if unauthorized
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const auth = {
  sync: () => api.post('/auth/sync'),
  me: () => api.get('/auth/me'),
  session: () => api.get('/auth/session'),
  updatePreferences: (preferences: Record<string, unknown>) =>
    api.put('/auth/preferences', preferences),
  exportData: () => api.get('/auth/export', { responseType: 'blob' }),
  deleteAccount: () => api.delete('/auth/account'),
};

// ============================================
// Chat API
// ============================================

export const chat = {
  sendMessage: (message: string, conversationId?: string, model?: string) =>
    api.post('/chat/completions', { message, conversationId, model, stream: false }),

  streamMessage: async (
    message: string,
    conversationId: string | undefined,
    onChunk: (chunk: string) => void,
    onDone: (data: { conversationId: string; model: string }) => void,
    onError: (error: string) => void
  ) => {
    try {
      // Get Clerk token
      let token = '';
      try {
        const Clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
        if (Clerk?.session) {
          token = (await Clerk.session.getToken()) || '';
        }
      } catch {
        // No token
      }

      const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ message, conversationId, stream: true }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        onError('No response body');
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                onChunk(data.content);
              }
              if (data.done) {
                onDone({ conversationId: data.conversationId, model: data.model });
              }
              if (data.error) {
                onError(data.error);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError((error as Error).message);
    }
  },

  regenerate: (conversationId: string, model?: string) =>
    api.post('/chat/regenerate', { conversationId, model }),

  getModels: () => api.get('/chat/models'),

  getHealth: () => api.get('/chat/providers/health'),

  testProviders: () => api.post('/chat/test'),
};

// ============================================
// Conversations API
// ============================================

export const conversations = {
  list: (params?: { limit?: number; offset?: number; projectId?: string; archived?: boolean }) =>
    api.get('/conversations', { params }),

  get: (id: string) => api.get(`/conversations/${id}`),

  create: (data: { title?: string; model?: string; projectId?: string }) =>
    api.post('/conversations', data),

  update: (id: string, data: { title?: string; tags?: string[]; isPinned?: boolean; isArchived?: boolean }) =>
    api.put(`/conversations/${id}`, data),

  delete: (id: string) => api.delete(`/conversations/${id}`),

  search: (q: string, limit?: number) =>
    api.get('/conversations/search', { params: { q, limit } }),
};

// ============================================
// Projects API
// ============================================

export const projects = {
  list: () => api.get('/projects'),

  get: (id: string) => api.get(`/projects/${id}`),

  create: (data: { name: string; description?: string; color?: string }) =>
    api.post('/projects', data),

  update: (id: string, data: { name?: string; description?: string; color?: string }) =>
    api.put(`/projects/${id}`, data),

  delete: (id: string) => api.delete(`/projects/${id}`),

  getConversations: (id: string) => api.get(`/projects/${id}/conversations`),
};

// ============================================
// Images API
// ============================================

export const images = {
  upload: (file: File, messageId?: string) => {
    const formData = new FormData();
    formData.append('images', file);
    if (messageId) formData.append('messageId', messageId);
    return api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  ocr: (file: File, language?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (language) formData.append('language', language);
    return api.post('/images/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  analyze: (file: File, prompt?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (prompt) formData.append('prompt', prompt);
    return api.post('/images/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============================================
// Audio API
// ============================================

export const audio = {
  upload: (file: File, conversationId?: string) => {
    const formData = new FormData();
    formData.append('audio', file);
    if (conversationId) formData.append('conversationId', conversationId);
    return api.post('/audio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  transcribe: (audioId: string, language?: string) =>
    api.post('/audio/transcribe', { audioId, language }),

  transcribeUpload: (file: File, language?: string) => {
    const formData = new FormData();
    formData.append('audio', file);
    if (language) formData.append('language', language);
    return api.post('/audio/transcribe-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  voiceChat: (file: File, conversationId?: string) => {
    const formData = new FormData();
    formData.append('audio', file);
    if (conversationId) formData.append('conversationId', conversationId);
    return api.post('/audio/voice-chat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getLanguages: () => api.get('/audio/config/languages'),

  // Translation APIs for Roman Urdu
  translate: (text: string, from?: string, to?: string) =>
    api.post('/audio/translate', { text, from, to }),

  translateToEnglish: (text: string) =>
    api.post('/audio/translate', { text, from: 'roman-urdu', to: 'english' }),

  translateToRomanUrdu: (text: string) =>
    api.post('/audio/translate', { text, from: 'english', to: 'roman-urdu' }),

  detectLanguage: (text: string) =>
    api.post('/audio/detect-language', { text }),
};

// ============================================
// Export API
// ============================================

export const exportApi = {
  download: (conversationId: string, format: 'json' | 'txt' | 'md' | 'pdf') =>
    api.get(`/export/${conversationId}`, {
      params: { format },
      responseType: format === 'pdf' ? 'blob' : 'text',
    }),

  preview: (conversationId: string, format: 'json' | 'txt' | 'md') =>
    api.get(`/export/${conversationId}/preview`, { params: { format } }),
};

// ============================================
// Share API
// ============================================

export const share = {
  create: (conversationId: string, expiresInDays?: number) =>
    api.post(`/share/${conversationId}`, { expiresInDays }),

  list: () => api.get('/share'),

  get: (shareId: string) => api.get(`/share/${shareId}`),

  revoke: (shareId: string) => api.delete(`/share/${shareId}`),
};

// ============================================
// Templates API
// ============================================

export const templates = {
  list: (category?: string) => api.get('/templates', { params: { category } }),

  get: (id: string) => api.get(`/templates/${id}`),

  create: (data: { name: string; systemPrompt: string; category?: string }) =>
    api.post('/templates', data),

  use: (id: string, title?: string) =>
    api.post(`/templates/${id}/use`, { title }),

  getCategories: () => api.get('/templates/categories'),
};

// ============================================
// Analytics API
// ============================================

export const analytics = {
  getDashboard: () => api.get('/analytics/dashboard'),

  getUsage: (period?: string) => api.get('/analytics/usage', { params: { period } }),

  getTokens: (days?: number) => api.get('/analytics/tokens', { params: { days } }),

  getConversations: () => api.get('/analytics/conversations'),

  getInsights: () => api.get('/analytics/insights'),

  export: (format: 'json' | 'csv', days?: number) =>
    api.get('/analytics/export', { params: { format, days } }),
};

// ============================================
// Webhooks API
// ============================================

export const webhooks = {
  list: () => api.get('/webhooks'),

  create: (url: string, events: string[]) =>
    api.post('/webhooks', { url, events }),

  update: (id: string, data: { url?: string; events?: string[]; isActive?: boolean }) =>
    api.put(`/webhooks/${id}`, data),

  delete: (id: string) => api.delete(`/webhooks/${id}`),

  test: (id: string) => api.post(`/webhooks/${id}/test`),

  getDeliveries: (id: string) => api.get(`/webhooks/${id}/deliveries`),

  getEvents: () => api.get('/webhooks/events'),
};

// ============================================
// API Keys API
// ============================================

export const apiKeys = {
  list: () => api.get('/api-keys'),

  create: (name: string, permissions?: string[]) =>
    api.post('/api-keys', { name, permissions }),

  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.put(`/api-keys/${id}`, data),

  delete: (id: string) => api.delete(`/api-keys/${id}`),

  rotate: (id: string) => api.post(`/api-keys/${id}/rotate`),

  getUsage: (id: string) => api.get(`/api-keys/${id}/usage`),
};

// ============================================
// Modes API
// ============================================

export const modes = {
  list: () => api.get('/modes'),

  get: (modeId: string) => api.get(`/modes/${modeId}`),

  detect: (message: string, attachments?: unknown[]) =>
    api.post('/modes/detect', { message, attachments }),
};

// ============================================
// TTS API
// ============================================

export const tts = {
  speak: (text: string, voice?: string) =>
    api.post('/tts/speak', { text, voice }, { responseType: 'blob' }),

  getVoices: () => api.get('/tts/voices'),
};

// ============================================
// Tags API
// ============================================

export const tags = {
  list: () => api.get('/tags'),

  create: (name: string, color?: string) =>
    api.post('/tags', { name, color }),

  update: (id: string, data: { name?: string; color?: string }) =>
    api.put(`/tags/${id}`, data),

  delete: (id: string) => api.delete(`/tags/${id}`),
};

// ============================================
// Profile API
// ============================================

export const profile = {
  get: () => api.get('/profile'),

  update: (data: { displayName?: string; avatar?: string }) =>
    api.put('/profile', data),

  getFacts: () => api.get('/profile/facts'),

  updateFact: (factId: string, data: { isActive?: boolean }) =>
    api.put(`/profile/facts/${factId}`, data),

  getUsage: () => api.get('/profile/usage'),

  updateInstructions: (instructions: string) =>
    api.put('/profile/instructions', { instructions }),
};

export default api;

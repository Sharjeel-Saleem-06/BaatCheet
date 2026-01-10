/**
 * API Service
 * Handles all HTTP requests to the backend
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

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const auth = {
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),

  updatePreferences: (preferences: Record<string, unknown>) =>
    api.put('/auth/preferences', { preferences }),
};

// ============================================
// Chat API
// ============================================

export const chat = {
  sendMessage: (message: string, conversationId?: string, model?: string) =>
    api.post('/chat/completions', { message, conversationId, model, stream: false }),

  streamMessage: (
    message: string,
    conversationId: string | undefined,
    onChunk: (chunk: string) => void,
    onDone: (data: { conversationId: string; model: string }) => void,
    onError: (error: string) => void
  ) => {
    const token = localStorage.getItem('token');
    const eventSource = new EventSource(
      `${API_BASE}/chat/completions?token=${token}&message=${encodeURIComponent(message)}&conversationId=${conversationId || ''}`
    );

    // For SSE, we need to use fetch with streaming
    fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, conversationId, stream: true }),
    })
      .then(async (response) => {
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
      })
      .catch((error) => {
        onError(error.message);
      });

    return eventSource;
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

export default api;

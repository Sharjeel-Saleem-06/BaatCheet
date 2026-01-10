// ============================================
// BaatCheet Type Definitions
// ============================================

import { User, Conversation, Message, Project, Role, Prisma } from '@prisma/client';

// Re-export Prisma types
export { User, Conversation, Message, Project, Role };

// ============================================
// User Types
// ============================================

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultModel: string;
  language: 'en' | 'ur';
}

export type UserWithoutPassword = Omit<User, 'password'>;

// ============================================
// Conversation Types
// ============================================

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationListItem {
  id: string;
  title: string;
  model: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  totalTokens: number;
  updatedAt: Date;
  createdAt: Date;
  messageCount?: number;
}

// ============================================
// AI Provider Types
// ============================================

export type AIProvider = 'groq' | 'openrouter' | 'deepseek' | 'huggingface' | 'gemini' | 'puter';

export interface AIProviderStatus {
  provider: AIProvider;
  isAvailable: boolean;
  availableKeys?: number;
  totalKeys?: number;
  currentKeyIndex?: number;
  lastError?: string;
  lastChecked: Date;
}

export interface AIKeyState {
  key: string;
  index: number;
  requestCount: number;
  isAvailable: boolean;
  lastUsed: Date;
  lastError?: string;
}

// ============================================
// Chat Types
// ============================================

export interface ChatRequest {
  message: string;
  conversationId?: string;
  model?: string;
  systemPrompt?: string;
  image?: {
    base64: string;
    mimeType: string;
  };
}

export interface ChatResponse {
  messageId: string;
  content: string;
  model: string;
  provider: AIProvider;
  tokens: number;
  conversationId: string;
}

export interface StreamChunk {
  type: 'start' | 'content' | 'error' | 'done';
  content?: string;
  error?: string;
  conversationId?: string;
  messageId?: string;
}

// ============================================
// Vision Types
// ============================================

export interface VisionRequest {
  image: string; // base64
  mimeType: string;
  prompt?: string;
  task: 'ocr' | 'analyze' | 'describe';
}

export interface VisionResponse {
  success: boolean;
  text?: string;
  description?: string;
  provider: AIProvider;
  model: string;
  error?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================
// Auth Types
// ============================================

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: UserWithoutPassword;
  token: string;
}

// ============================================
// Context Manager Types
// ============================================

export interface ConversationContext {
  conversationId: string;
  systemPrompt?: string;
  messages: ContextMessage[];
  totalTokens: number;
}

export interface ContextMessage {
  role: Role;
  content: string;
  tokens: number;
}

// ============================================
// Express Extensions
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ============================================
// Utility Types
// ============================================

export type JsonValue = Prisma.JsonValue;

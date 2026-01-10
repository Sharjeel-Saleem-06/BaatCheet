/**
 * BaatCheet Type Definitions
 * Centralized type definitions for the entire backend
 * 
 * @module Types
 */

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

export type ProviderName = 'groq' | 'openrouter' | 'deepseek' | 'huggingface' | 'gemini' | 'ocrspace';

export interface ProviderHealth {
  available: boolean;
  totalKeys: number;
  availableKeys: number;
  totalCapacity: number;
  usedToday: number;
  lastChecked: Date;
}

export interface AIKeyState {
  key: string;
  index: number;
  requestCount: number;
  isAvailable: boolean;
  lastUsed: Date;
  lastError?: string;
  errorCount: number;
}

// ============================================
// Chat Types
// ============================================

export interface ChatRequest {
  message: string;
  conversationId?: string;
  model?: string;
  systemPrompt?: string;
  stream?: boolean;
  image?: {
    base64: string;
    mimeType: string;
  };
}

export interface ChatResponse {
  messageId: string;
  content: string;
  model: string;
  provider: ProviderName;
  tokens: number;
  conversationId: string;
}

export interface StreamChunk {
  type: 'start' | 'content' | 'error' | 'done';
  content?: string;
  error?: string;
  conversationId?: string;
  messageId?: string;
  model?: string;
  provider?: ProviderName;
}

// ============================================
// Vision & OCR Types
// ============================================

export interface VisionRequest {
  image: string; // base64
  mimeType: string;
  prompt?: string;
  language?: 'en' | 'ur';
}

export interface VisionResponse {
  success: boolean;
  response: string;
  provider: ProviderName | 'unknown';
  model?: string;
  processingTime?: number;
  error?: string;
}

export interface OCRRequest {
  image: string; // base64
  mimeType: string;
  language?: string;
  isTable?: boolean;
}

export interface OCRResponse {
  success: boolean;
  text: string;
  provider: ProviderName | 'unknown';
  confidence?: number;
  language?: string;
  processingTime?: number;
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
  code?: string;
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

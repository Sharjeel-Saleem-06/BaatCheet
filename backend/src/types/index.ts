// ============================================
// BaatCheet Type Definitions
// ============================================

// User Types
export interface IUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  preferences: IUserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserPreferences {
  theme: 'light' | 'dark';
  defaultModel: string;
  language: 'en' | 'ur';
}

// Message Types
export interface IMessage {
  messageId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  attachments?: IAttachment[];
  model?: string;
  tokens?: number;
  timestamp: Date;
}

export interface IAttachment {
  attachmentId: string;
  type: 'image' | 'document';
  url: string;
  extractedText?: string;
  metadata?: Record<string, unknown>;
}

// Conversation Types
export interface IConversation {
  _id?: string;
  conversationId: string;
  userId: string;
  projectId?: string;
  title: string;
  messages: IMessage[];
  systemPrompt?: string;
  model: string;
  tags: string[];
  isArchived: boolean;
  isPinned: boolean;
  totalTokens: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Project Types
export interface IProject {
  _id?: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  conversationCount: number;
  color?: string;
  icon?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// AI Provider Types
export type AIProvider = 'groq' | 'together' | 'deepseek' | 'puter';

export interface IAIProviderStatus {
  provider: AIProvider;
  isAvailable: boolean;
  currentKeyIndex?: number;
  totalKeys?: number;
  lastError?: string;
  lastChecked: Date;
}

export interface IChatRequest {
  message: string;
  conversationId?: string;
  model?: string;
  systemPrompt?: string;
  attachments?: IAttachment[];
}

export interface IChatResponse {
  messageId: string;
  content: string;
  model: string;
  provider: AIProvider;
  tokens: number;
  conversationId: string;
}

// API Response Types
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth Types
export interface IAuthPayload {
  userId: string;
  email: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Streaming Types
export interface IStreamChunk {
  type: 'content' | 'error' | 'done';
  content?: string;
  error?: string;
  messageId?: string;
}

/**
 * BaatCheet Configuration
 * Centralized configuration management for all services
 */

import dotenv from 'dotenv';

dotenv.config();

// ============================================
// Helper Functions
// ============================================

/**
 * Get API keys from environment with prefix pattern
 * Supports both numbered (PREFIX_1, PREFIX_2) and single (PREFIX) formats
 */
const getApiKeys = (
  prefix: string, 
  validator: (key: string) => boolean, 
  maxKeys: number = 20
): string[] => {
  const keys: string[] = [];
  
  // Check numbered keys (PREFIX_1, PREFIX_2, etc.)
  for (let i = 1; i <= maxKeys; i++) {
    const key = process.env[`${prefix}_${i}`];
    if (key && validator(key)) {
      keys.push(key);
    }
  }
  
  // Also check single key format (PREFIX without number)
  const singleKey = process.env[prefix];
  if (singleKey && validator(singleKey) && !keys.includes(singleKey)) {
    keys.push(singleKey);
  }
  
  return keys;
};

/**
 * Get required environment variable or throw error
 */
const getRequired = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Get optional environment variable with default
 */
const getOptional = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

/**
 * Parse integer from environment variable
 */
const getInt = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

// ============================================
// Configuration Object
// ============================================

export const config = {
  // ============================================
  // Server Configuration
  // ============================================
  server: {
    nodeEnv: getOptional('NODE_ENV', 'development'),
    port: getInt('PORT', 5001),
    apiVersion: getOptional('API_VERSION', 'v1'),
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },
  
  // ============================================
  // Database Configuration
  // ============================================
  database: {
    url: getOptional(
      'DATABASE_URL', 
      'postgresql://baatcheet_user:BaatCheet2024Secure!@localhost:5432/baatcheet?schema=public'
    ),
    redisUrl: getOptional('REDIS_URL', 'redis://localhost:6379'),
  },
  
  // ============================================
  // Authentication Configuration
  // ============================================
  auth: {
    jwtSecret: getOptional('JWT_SECRET', 'default-secret-change-me-in-production'),
    jwtExpiresIn: getOptional('JWT_EXPIRES_IN', '7d'),
  },
  
  // ============================================
  // AI Provider API Keys
  // ============================================
  providers: {
    // Groq (Primary for chat - fastest inference)
    groq: {
      keys: getApiKeys('GROQ_API_KEY', (k) => k.startsWith('gsk_')),
      dailyLimit: 14400,
      description: 'Primary chat provider - fastest inference',
    },
    
    // OpenRouter (Backup for chat, access to 100+ models)
    openRouter: {
      keys: getApiKeys('OPENROUTER_API_KEY', (k) => k.startsWith('sk-or-')),
      dailyLimit: 200,
      description: 'Backup chat provider - 100+ models available',
    },
    
    // DeepSeek (Backup for chat)
    deepSeek: {
      keys: getApiKeys('DEEPSEEK_API_KEY', (k) => k.startsWith('sk-')),
      dailyLimit: 1000,
      description: 'Secondary backup for chat',
    },
    
    // Hugging Face (For embeddings, specialized models)
    huggingFace: {
      keys: getApiKeys('HUGGINGFACE_API_KEY', (k) => k.startsWith('hf_')),
      dailyLimit: 1000,
      description: 'Image captioning and specialized models',
    },
    
    // Google Gemini (For vision, multimodal)
    gemini: {
      keys: getApiKeys('GEMINI_API_KEY', (k) => k.startsWith('AIza')),
      dailyLimit: 1500,
      description: 'Vision and multimodal tasks',
    },
    
    // OCR.space (Primary for OCR)
    ocrSpace: {
      keys: getApiKeys('OCR_SPACE_API_KEY', (k) => k.startsWith('K')),
      dailyLimit: 500,
      description: 'Primary OCR provider - 60+ languages',
    },
  },
  
  // ============================================
  // Rate Limiting Configuration
  // ============================================
  rateLimit: {
    windowMs: getInt('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getInt('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  
  // ============================================
  // Logging Configuration
  // ============================================
  logging: {
    level: getOptional('LOG_LEVEL', 'debug'),
  },
  
  // ============================================
  // AI Model Configuration
  // ============================================
  ai: {
    defaultModel: getOptional('DEFAULT_MODEL', 'llama-3.3-70b-versatile'),
    maxContextMessages: getInt('MAX_CONTEXT_MESSAGES', 50),
    maxTokens: getInt('MAX_TOKENS', 8000),
    streamingEnabled: true,
  },
  
  // ============================================
  // Service URLs
  // ============================================
  urls: {
    groq: 'https://api.groq.com/openai/v1',
    openRouter: 'https://openrouter.ai/api/v1',
    deepSeek: 'https://api.deepseek.com/v1',
    huggingFace: 'https://router.huggingface.co/hf-inference',
    gemini: 'https://generativelanguage.googleapis.com/v1beta',
    ocrSpace: 'https://api.ocr.space/parse/image',
  },
} as const;

// ============================================
// Legacy Exports (for backward compatibility)
// ============================================

// Flat exports for existing code
export const nodeEnv = config.server.nodeEnv;
export const port = config.server.port;
export const databaseUrl = config.database.url;
export const redisUrl = config.database.redisUrl;
export const jwtSecret = config.auth.jwtSecret;
export const jwtExpiresIn = config.auth.jwtExpiresIn;

// Provider keys (flat)
export const groqApiKeys = config.providers.groq.keys;
export const openRouterApiKeys = config.providers.openRouter.keys;
export const deepseekApiKeys = config.providers.deepSeek.keys;
export const huggingFaceApiKeys = config.providers.huggingFace.keys;
export const geminiApiKeys = config.providers.gemini.keys;
export const ocrSpaceApiKeys = config.providers.ocrSpace.keys;

// Limits
export const rateLimitWindowMs = config.rateLimit.windowMs;
export const rateLimitMaxRequests = config.rateLimit.maxRequests;
export const logLevel = config.logging.level;
export const defaultModel = config.ai.defaultModel;
export const maxContextMessages = config.ai.maxContextMessages;
export const maxTokens = config.ai.maxTokens;

// Provider limits object
export const limits = {
  groq: config.providers.groq.dailyLimit,
  openRouter: config.providers.openRouter.dailyLimit,
  deepseek: config.providers.deepSeek.dailyLimit,
  huggingFace: config.providers.huggingFace.dailyLimit,
  gemini: config.providers.gemini.dailyLimit,
  ocrSpace: config.providers.ocrSpace.dailyLimit,
};

export type Config = typeof config;
export default config;

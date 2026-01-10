import dotenv from 'dotenv';

dotenv.config();

/**
 * Get API keys from environment with prefix pattern
 */
const getApiKeys = (prefix: string, validator: (key: string) => boolean, maxKeys: number = 20): string[] => {
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
 * Application configuration with all API providers
 */
export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://baatcheet_user:BaatCheet2024Secure!@localhost:5432/baatcheet?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // ============================================
  // AI Providers - Keys
  // ============================================
  
  // Groq (Primary for chat - fastest)
  groqApiKeys: getApiKeys('GROQ_API_KEY', (k) => k.startsWith('gsk_')),
  
  // OpenRouter (Backup for chat, access to 100+ models)
  openRouterApiKeys: getApiKeys('OPENROUTER_API_KEY', (k) => k.startsWith('sk-or-')),
  
  // DeepSeek (Backup for chat)
  deepseekApiKeys: getApiKeys('DEEPSEEK_API_KEY', (k) => k.startsWith('sk-')),
  
  // Hugging Face (For image-to-text, OCR, embeddings)
  huggingFaceApiKeys: getApiKeys('HUGGINGFACE_API_KEY', (k) => k.startsWith('hf_')),
  
  // Google Gemini (For vision, multimodal)
  geminiApiKeys: getApiKeys('GEMINI_API_KEY', (k) => k.startsWith('AIza')),
  
  // Together AI (optional)
  togetherApiKey: process.env.TOGETHER_API_KEY || '',
  
  // OCR.space (for OCR fallback)
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || '',
  
  // ============================================
  // Rate Limiting
  // ============================================
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  
  // ============================================
  // AI Model Configuration
  // ============================================
  defaultModel: process.env.DEFAULT_MODEL || 'llama-3.3-70b-versatile',
  maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10),
  maxTokens: parseInt(process.env.MAX_TOKENS || '8000', 10),
  
  // Provider limits (requests per day per key)
  limits: {
    groq: 14400,
    openRouter: 200, // Free tier is limited
    deepseek: 1000,
    huggingFace: 1000,
    gemini: 1500,
  },
} as const;

export type Config = typeof config;
export default config;

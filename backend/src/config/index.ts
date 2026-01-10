import dotenv from 'dotenv';

dotenv.config();

/**
 * Get all configured Groq API keys (supports up to 20 keys)
 */
const getGroqKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.startsWith('gsk_')) {
      keys.push(key);
    }
  }
  return keys;
};

/**
 * Get all configured DeepSeek API keys
 */
const getDeepSeekKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`DEEPSEEK_API_KEY_${i}`];
    if (key && key.startsWith('sk-')) {
      keys.push(key);
    }
  }
  // Also check single key format
  const singleKey = process.env.DEEPSEEK_API_KEY;
  if (singleKey && singleKey.startsWith('sk-') && !keys.includes(singleKey)) {
    keys.push(singleKey);
  }
  return keys;
};

/**
 * Application configuration
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
  
  // AI Providers
  groqApiKeys: getGroqKeys(),
  deepseekApiKeys: getDeepSeekKeys(),
  togetherApiKey: process.env.TOGETHER_API_KEY || '',
  
  // OCR
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || '',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  
  // AI Model Configuration
  defaultModel: process.env.DEFAULT_MODEL || 'llama-3.1-70b-versatile',
  maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10),
  maxTokens: parseInt(process.env.MAX_TOKENS || '8000', 10),
  
  // Groq limits
  groqDailyLimit: 14400, // requests per key per day
} as const;

export type Config = typeof config;
export default config;

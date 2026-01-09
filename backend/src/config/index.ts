import dotenv from 'dotenv';

dotenv.config();

// Helper to get Groq API keys
const getGroqKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key !== `your-groq-api-key-${i}`) {
      keys.push(key);
    }
  }
  return keys;
};

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/baatcheet',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // AI Providers
  groqApiKeys: getGroqKeys(),
  togetherApiKey: process.env.TOGETHER_API_KEY || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  
  // OCR
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || '',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  
  // AI Models
  defaultModel: 'llama-3.1-70b-versatile',
  maxContextMessages: 50,
  maxTokens: 8000,
};

export default config;

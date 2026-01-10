import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { getRedis } from '../config/database.js';
import { config } from '../config/index.js';

// Note: Request.user type is defined in types/index.ts

// ============================================
// Request ID Middleware
// ============================================
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// ============================================
// Response Time Middleware
// ============================================
export const responseTime = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (parseFloat(duration) > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

// ============================================
// Security Headers with Helmet
// ============================================
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://clerk.com", "https://*.clerk.accounts.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.clerk.com", "https://*.clerk.accounts.dev", "wss:"],
      frameSrc: ["'self'", "https://clerk.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.server.nodeEnv === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  hidePoweredBy: true,
});

// ============================================
// CORS Configuration
// ============================================
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      // Add production domains here
      // 'https://baatcheet.com',
      // 'https://www.baatcheet.com',
    ];

    if (config.server.nodeEnv === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
  exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

// ============================================
// Global Rate Limiter
// ============================================
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour per IP
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready' || req.path === '/live';
  },
});

// ============================================
// Endpoint-Specific Rate Limiters
// ============================================

// Auth endpoints - strict rate limiting
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat completions - tiered rate limiting
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: Request) => {
    // Check user tier for different limits
    const user = req.user;
    if (!user) return 100; // Free tier: 100/hour
    
    switch (user.tier) {
      case 'enterprise':
        return 10000;
      case 'pro':
        return 1000;
      default:
        return 100;
    }
  },
  message: {
    success: false,
    error: 'Chat rate limit exceeded. Upgrade for higher limits.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip || 'unknown';
  },
});

// Image upload - moderate rate limiting
export const imageRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Image upload rate limit exceeded.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Audio transcription - strict rate limiting
export const audioRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 transcriptions per hour
  message: {
    success: false,
    error: 'Audio transcription rate limit exceeded.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search - moderate rate limiting
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 searches per hour
  message: {
    success: false,
    error: 'Search rate limit exceeded.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// Redis-Based Distributed Rate Limiter
// ============================================
export const distributedRateLimiter = async (
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
  const redis = getRedis();
  const now = Date.now();
  
  if (!redis) {
    // Fallback: allow request if Redis is unavailable
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }

  const windowStart = now - windowSeconds * 1000;
  const redisKey = `ratelimit:${key}`;

  try {
    // Remove old entries
    await redis.zRemRangeByScore(redisKey, 0, windowStart);
    
    // Count current entries
    const count = await redis.zCard(redisKey);
    
    if (count >= limit) {
      // Get oldest entry to calculate reset time
      const oldestEntries = await redis.zRangeWithScores(redisKey, 0, 0);
      const resetAt = oldestEntries.length > 0 
        ? oldestEntries[0].score + windowSeconds * 1000 
        : now + windowSeconds * 1000;
      
      return { allowed: false, remaining: 0, resetAt };
    }
    
    // Add new entry
    await redis.zAdd(redisKey, { score: now, value: `${now}` });
    await redis.expire(redisKey, windowSeconds);
    
    return { allowed: true, remaining: limit - count - 1, resetAt: now + windowSeconds * 1000 };
  } catch (error) {
    logger.error('Redis rate limiter error:', error);
    return { allowed: true, remaining: limit, resetAt: now + windowSeconds * 1000 };
  }
};

// ============================================
// IP Whitelist Middleware
// ============================================
const whitelistedIPs = new Set([
  '127.0.0.1',
  '::1',
  // Add trusted IPs here
]);

export const ipWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.headers['x-forwarded-for'] as string;
  
  if (whitelistedIPs.has(clientIP)) {
    // Skip rate limiting for whitelisted IPs
    (req as any).skipRateLimit = true;
  }
  
  next();
};

// ============================================
// Input Sanitization Middleware
// ============================================
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    }
  }
  
  // Sanitize body (for JSON)
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  next();
};

function sanitizeString(str: string): string {
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Trim excessive whitespace
  str = str.trim();
  
  // Limit length
  if (str.length > 10000) {
    str = str.substring(0, 10000);
  }
  
  return str;
}

function sanitizeObject(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// ============================================
// SQL/NoSQL Injection Prevention
// ============================================
export const preventInjection = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousPatterns = [
    /(\$where|\$regex|\$gt|\$lt|\$ne|\$or|\$and)/i, // MongoDB operators
    /(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|TRUNCATE)/i, // SQL keywords
    /(<script|javascript:|on\w+=)/i, // XSS patterns
  ];
  
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };
  
  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    logger.warn(`Potential injection attempt from IP: ${req.ip}, Path: ${req.path}`);
    res.status(400).json({
      success: false,
      error: 'Invalid input detected',
    });
    return;
  }
  
  next();
};

// ============================================
// File Upload Security
// ============================================
export const validateFileUpload = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files 
      ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
      : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        });
      }
      
      // Check MIME type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }
      
      // Sanitize filename
      file.originalname = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 255);
    }
    
    next();
  };
};

// ============================================
// SSRF Prevention
// ============================================
const privateIPRanges = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP(S)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Block private IPs
    if (privateIPRanges.some(pattern => pattern.test(parsed.hostname))) {
      return false;
    }
    
    // Block localhost
    if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.local')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

// ============================================
// Export all security middleware
// ============================================
export const securityMiddleware = [
  requestId,
  responseTime,
  securityHeaders,
  globalRateLimiter,
  sanitizeInput,
  preventInjection,
];

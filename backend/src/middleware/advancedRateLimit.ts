/**
 * Advanced Rate Limiting Middleware
 * Tiered rate limiting based on user subscription level
 * Supports Redis-backed distributed rate limiting
 * 
 * @module AdvancedRateLimit
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { cacheService } from '../services/CacheService.js';

// ============================================
// Types
// ============================================

export interface TierLimits {
  free: number;
  pro: number;
  enterprise: number;
  window: number; // in milliseconds
}

export interface RateLimitConfig {
  endpoint: string;
  limits: TierLimits;
  skipAdmins?: boolean;
  keyGenerator?: (req: Request) => string;
}

// ============================================
// Default Limits by Endpoint
// ============================================

export const RATE_LIMITS: Record<string, TierLimits> = {
  // Chat endpoints
  'chat': {
    free: 50,        // 50 messages per hour
    pro: 500,        // 500 messages per hour
    enterprise: 5000, // 5000 messages per hour
    window: 60 * 60 * 1000, // 1 hour
  },
  
  // Image upload
  'image-upload': {
    free: 10,        // 10 images per hour
    pro: 100,        // 100 images per hour
    enterprise: 1000, // 1000 images per hour
    window: 60 * 60 * 1000,
  },
  
  // Audio transcription
  'audio': {
    free: 5,         // 5 transcriptions per hour
    pro: 50,         // 50 per hour
    enterprise: 500,  // 500 per hour
    window: 60 * 60 * 1000,
  },
  
  // Web search
  'search': {
    free: 10,        // 10 searches per hour
    pro: 100,        // 100 per hour
    enterprise: 1000, // 1000 per hour
    window: 60 * 60 * 1000,
  },
  
  // TTS
  'tts': {
    free: 5,         // 5 TTS requests per hour
    pro: 50,         // 50 per hour
    enterprise: 500,  // 500 per hour
    window: 60 * 60 * 1000,
  },
  
  // Export
  'export': {
    free: 10,        // 10 exports per hour
    pro: 100,        // 100 per hour
    enterprise: 1000, // 1000 per hour
    window: 60 * 60 * 1000,
  },
  
  // Profile/Memory
  'profile': {
    free: 30,        // 30 requests per hour
    pro: 300,        // 300 per hour
    enterprise: 3000, // 3000 per hour
    window: 60 * 60 * 1000,
  },
  
  // API (general)
  'api': {
    free: 100,       // 100 requests per 15 minutes
    pro: 1000,       // 1000 per 15 minutes
    enterprise: 10000, // 10000 per 15 minutes
    window: 15 * 60 * 1000, // 15 minutes
  },
};

// ============================================
// Rate Limit Store (Redis-backed)
// ============================================

class RateLimitStore {
  prefix: string;
  windowMs: number;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const cacheKey = `ratelimit:${this.prefix}:${key}`;
    
    try {
      // Try to get current count from cache
      const current = await cacheService.get<{ count: number; resetTime: number }>(cacheKey);
      
      if (current) {
        const newCount = current.count + 1;
        await cacheService.set(cacheKey, { count: newCount, resetTime: current.resetTime }, Math.ceil(this.windowMs / 1000));
        return { totalHits: newCount, resetTime: new Date(current.resetTime) };
      } else {
        // Start new window
        const resetTime = Date.now() + this.windowMs;
        await cacheService.set(cacheKey, { count: 1, resetTime }, Math.ceil(this.windowMs / 1000));
        return { totalHits: 1, resetTime: new Date(resetTime) };
      }
    } catch (error) {
      // Fallback to in-memory if Redis fails
      logger.warn('Rate limit Redis failed, using fallback');
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    const cacheKey = `ratelimit:${this.prefix}:${key}`;
    try {
      const current = await cacheService.get<{ count: number; resetTime: number }>(cacheKey);
      if (current && current.count > 0) {
        await cacheService.set(cacheKey, { count: current.count - 1, resetTime: current.resetTime }, Math.ceil(this.windowMs / 1000));
      }
    } catch (error) {
      // Ignore errors on decrement
    }
  }

  async resetKey(key: string): Promise<void> {
    const cacheKey = `ratelimit:${this.prefix}:${key}`;
    await cacheService.delete(cacheKey);
  }
}

// ============================================
// Create Tiered Rate Limiter
// ============================================

export function createTieredRateLimiter(config: RateLimitConfig) {
  const { endpoint, limits, skipAdmins = true, keyGenerator } = config;
  
  const store = new RateLimitStore(endpoint, limits.window);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID
      const userId = (req as any).user?.id;
      
      if (!userId) {
        // No user, apply free tier limits
        return applyRateLimit(req, res, next, store, limits.free, limits.window, 'anonymous');
      }
      
      // Get user tier
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true, role: true },
      });
      
      // Skip rate limiting for admins if configured
      if (skipAdmins && user?.role === 'admin') {
        return next();
      }
      
      // Get limit for user's tier
      const tier = (user?.tier || 'free') as keyof TierLimits;
      const limit = limits[tier] || limits.free;
      
      // Generate key
      const key = keyGenerator ? keyGenerator(req) : userId;
      
      return applyRateLimit(req, res, next, store, limit, limits.window, key);
      
    } catch (error) {
      logger.error('Rate limit error:', error);
      // On error, allow request but log
      next();
    }
  };
}

/**
 * Apply rate limit check
 */
async function applyRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  store: RateLimitStore,
  limit: number,
  windowMs: number,
  key: string
) {
  const { totalHits, resetTime } = await store.increment(key);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
  res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
  
  if (totalHits > limit) {
    const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    
    logger.warn('Rate limit exceeded', {
      key,
      totalHits,
      limit,
      retryAfter,
    });
    
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
      limit,
      remaining: 0,
    });
  }
  
  next();
}

// ============================================
// Pre-configured Rate Limiters
// ============================================

export const chatRateLimiter = createTieredRateLimiter({
  endpoint: 'chat',
  limits: RATE_LIMITS.chat,
});

export const imageUploadRateLimiter = createTieredRateLimiter({
  endpoint: 'image-upload',
  limits: RATE_LIMITS['image-upload'],
});

export const audioRateLimiter = createTieredRateLimiter({
  endpoint: 'audio',
  limits: RATE_LIMITS.audio,
});

export const searchRateLimiter = createTieredRateLimiter({
  endpoint: 'search',
  limits: RATE_LIMITS.search,
});

export const ttsRateLimiter = createTieredRateLimiter({
  endpoint: 'tts',
  limits: RATE_LIMITS.tts,
});

export const exportRateLimiter = createTieredRateLimiter({
  endpoint: 'export',
  limits: RATE_LIMITS.export,
});

export const profileRateLimiter = createTieredRateLimiter({
  endpoint: 'profile',
  limits: RATE_LIMITS.profile,
});

export const apiRateLimiter = createTieredRateLimiter({
  endpoint: 'api',
  limits: RATE_LIMITS.api,
});

// ============================================
// IP-based Rate Limiter (for unauthenticated)
// ============================================

export const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// ============================================
// Burst Protection
// ============================================

export function burstProtection(maxBurst: number = 10, windowMs: number = 1000) {
  const requests = new Map<string, number[]>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req as any).user?.id || req.ip || 'unknown';
    const now = Date.now();
    
    // Get request timestamps for this key
    let timestamps = requests.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(t => now - t < windowMs);
    
    if (timestamps.length >= maxBurst) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests in short time',
        message: 'Please slow down',
      });
    }
    
    timestamps.push(now);
    requests.set(key, timestamps);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of requests.entries()) {
        if (v.every(t => now - t > windowMs)) {
          requests.delete(k);
        }
      }
    }
    
    next();
  };
}

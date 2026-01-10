/**
 * Cache Service
 * Centralized Redis caching with TTL management
 * 
 * @module CacheService
 */

import { getRedis } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Cache Key Prefixes
// ============================================

const CACHE_PREFIXES = {
  USER_SESSION: 'session:',
  CONVERSATION_CONTEXT: 'context:',
  PROJECT_STATS: 'project_stats:',
  ANALYTICS_DASHBOARD: 'analytics:dashboard:',
  OCR_RESULT: 'ocr:',
  AUDIO_TRANSCRIPTION: 'transcription:',
  PROVIDER_HEALTH: 'provider_health:',
  RATE_LIMIT: 'ratelimit:',
  SEARCH_RESULTS: 'search:',
} as const;

// ============================================
// Cache TTL Configuration (in seconds)
// ============================================

const CACHE_TTL = {
  USER_SESSION: 7 * 24 * 60 * 60, // 7 days
  CONVERSATION_CONTEXT: 24 * 60 * 60, // 24 hours
  PROJECT_STATS: 60 * 60, // 1 hour
  ANALYTICS_DASHBOARD: 5 * 60, // 5 minutes
  OCR_RESULT: 0, // Permanent (until image deleted)
  AUDIO_TRANSCRIPTION: 0, // Permanent (until audio deleted)
  PROVIDER_HEALTH: 60, // 1 minute
  RATE_LIMIT: 60 * 60, // 1 hour
  SEARCH_RESULTS: 10 * 60, // 10 minutes
} as const;

// ============================================
// Cache Service Class
// ============================================

class CacheServiceClass {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      logger.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.setEx(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.warn(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.warn(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.warn(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return -1;

    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.warn(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // ============================================
  // Specialized Cache Methods
  // ============================================

  /**
   * Cache user session
   */
  async cacheUserSession(userId: string, sessionData: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${userId}`;
    return this.set(key, sessionData, CACHE_TTL.USER_SESSION);
  }

  /**
   * Get cached user session
   */
  async getUserSession<T>(userId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${userId}`;
    return this.get<T>(key);
  }

  /**
   * Invalidate user session
   */
  async invalidateUserSession(userId: string): Promise<boolean> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${userId}`;
    return this.del(key);
  }

  /**
   * Cache conversation context
   */
  async cacheConversationContext(conversationId: string, context: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.CONVERSATION_CONTEXT}${conversationId}`;
    return this.set(key, context, CACHE_TTL.CONVERSATION_CONTEXT);
  }

  /**
   * Get cached conversation context
   */
  async getConversationContext<T>(conversationId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.CONVERSATION_CONTEXT}${conversationId}`;
    return this.get<T>(key);
  }

  /**
   * Invalidate conversation context
   */
  async invalidateConversationContext(conversationId: string): Promise<boolean> {
    const key = `${CACHE_PREFIXES.CONVERSATION_CONTEXT}${conversationId}`;
    return this.del(key);
  }

  /**
   * Cache project statistics
   */
  async cacheProjectStats(projectId: string, stats: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.PROJECT_STATS}${projectId}`;
    return this.set(key, stats, CACHE_TTL.PROJECT_STATS);
  }

  /**
   * Get cached project statistics
   */
  async getProjectStats<T>(projectId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.PROJECT_STATS}${projectId}`;
    return this.get<T>(key);
  }

  /**
   * Invalidate project statistics (call when project data changes)
   */
  async invalidateProjectStats(projectId: string): Promise<boolean> {
    const key = `${CACHE_PREFIXES.PROJECT_STATS}${projectId}`;
    return this.del(key);
  }

  /**
   * Cache analytics dashboard
   */
  async cacheAnalyticsDashboard(userId: string, dashboard: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.ANALYTICS_DASHBOARD}${userId}`;
    return this.set(key, dashboard, CACHE_TTL.ANALYTICS_DASHBOARD);
  }

  /**
   * Get cached analytics dashboard
   */
  async getAnalyticsDashboard<T>(userId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.ANALYTICS_DASHBOARD}${userId}`;
    return this.get<T>(key);
  }

  /**
   * Invalidate analytics dashboard (call when new analytics recorded)
   */
  async invalidateAnalyticsDashboard(userId: string): Promise<boolean> {
    const key = `${CACHE_PREFIXES.ANALYTICS_DASHBOARD}${userId}`;
    return this.del(key);
  }

  /**
   * Cache OCR result (permanent until deleted)
   */
  async cacheOCRResult(imageId: string, result: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.OCR_RESULT}${imageId}`;
    return this.set(key, result); // No TTL - permanent
  }

  /**
   * Get cached OCR result
   */
  async getOCRResult<T>(imageId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.OCR_RESULT}${imageId}`;
    return this.get<T>(key);
  }

  /**
   * Delete OCR result (when image deleted)
   */
  async deleteOCRResult(imageId: string): Promise<boolean> {
    const key = `${CACHE_PREFIXES.OCR_RESULT}${imageId}`;
    return this.del(key);
  }

  /**
   * Cache audio transcription (permanent until deleted)
   */
  async cacheTranscription(audioId: string, transcription: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.AUDIO_TRANSCRIPTION}${audioId}`;
    return this.set(key, transcription); // No TTL - permanent
  }

  /**
   * Get cached transcription
   */
  async getTranscription<T>(audioId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.AUDIO_TRANSCRIPTION}${audioId}`;
    return this.get<T>(key);
  }

  /**
   * Delete transcription (when audio deleted)
   */
  async deleteTranscription(audioId: string): Promise<boolean> {
    const key = `${CACHE_PREFIXES.AUDIO_TRANSCRIPTION}${audioId}`;
    return this.del(key);
  }

  /**
   * Cache provider health status
   */
  async cacheProviderHealth(providerId: string, health: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.PROVIDER_HEALTH}${providerId}`;
    return this.set(key, health, CACHE_TTL.PROVIDER_HEALTH);
  }

  /**
   * Get cached provider health
   */
  async getProviderHealth<T>(providerId: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.PROVIDER_HEALTH}${providerId}`;
    return this.get<T>(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(queryHash: string, results: object): Promise<boolean> {
    const key = `${CACHE_PREFIXES.SEARCH_RESULTS}${queryHash}`;
    return this.set(key, results, CACHE_TTL.SEARCH_RESULTS);
  }

  /**
   * Get cached search results
   */
  async getSearchResults<T>(queryHash: string): Promise<T | null> {
    const key = `${CACHE_PREFIXES.SEARCH_RESULTS}${queryHash}`;
    return this.get<T>(key);
  }

  // ============================================
  // Cache Statistics
  // ============================================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
  }> {
    const redis = getRedis();
    if (!redis) {
      return { connected: false, keys: 0, memory: '0' };
    }

    try {
      const info = await redis.info('memory');
      const dbSize = await redis.dbSize();
      
      // Parse memory usage from INFO output
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        connected: true,
        keys: dbSize,
        memory,
      };
    } catch (error) {
      logger.warn('Cache stats error:', error);
      return { connected: false, keys: 0, memory: '0' };
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
      await redis.flushDb();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }
}

// Export singleton
export const cacheService = new CacheServiceClass();

// Export prefixes and TTLs for reference
export { CACHE_PREFIXES, CACHE_TTL };

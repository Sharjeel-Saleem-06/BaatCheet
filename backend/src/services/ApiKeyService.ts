/**
 * API Key Service
 * User API key management with rate limiting
 * 
 * @module ApiKeyService
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '../config/database.js';

// ============================================
// Types
// ============================================

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  lastUsed?: Date | null;
  expiresAt?: Date | null;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  keyId?: string;
  permissions?: string[];
  error?: string;
}

// ============================================
// Constants
// ============================================

const KEY_PREFIX = 'bc_';
const KEY_LENGTH = 32;
const RATE_LIMITS = {
  free: 100,      // requests per hour
  pro: 1000,
  enterprise: 10000,
};

// ============================================
// API Key Service Class
// ============================================

class ApiKeyServiceClass {
  /**
   * Generate a new API key
   */
  public async createApiKey(
    userId: string,
    name: string,
    options: {
      permissions?: string[];
      rateLimit?: number;
      expiresInDays?: number;
    } = {}
  ): Promise<{ success: boolean; apiKey?: string; keyInfo?: ApiKeyInfo; error?: string }> {
    try {
      // Generate key
      const rawKey = KEY_PREFIX + crypto.randomBytes(KEY_LENGTH).toString('hex');
      const keyPrefix = rawKey.substring(0, 8);
      const keyHash = await bcrypt.hash(rawKey, 10);

      // Get user tier for default rate limit
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      });

      const defaultRateLimit = RATE_LIMITS[(user?.tier as keyof typeof RATE_LIMITS) || 'free'];

      // Calculate expiry
      const expiresAt = options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          name,
          keyHash,
          keyPrefix,
          permissions: options.permissions || ['read', 'write'],
          rateLimit: options.rateLimit || defaultRateLimit,
          expiresAt,
        },
      });

      logger.info(`API key created: ${keyPrefix}... for user ${userId}`);

      return {
        success: true,
        apiKey: rawKey, // Only shown once!
        keyInfo: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          permissions: apiKey.permissions,
          rateLimit: apiKey.rateLimit,
          expiresAt: apiKey.expiresAt,
          isActive: apiKey.isActive,
          usageCount: apiKey.usageCount,
          createdAt: apiKey.createdAt,
        },
      };
    } catch (error) {
      logger.error('Create API key error:', error);
      return { success: false, error: 'Failed to create API key' };
    }
  }

  /**
   * Validate an API key
   */
  public async validateApiKey(key: string): Promise<ApiKeyValidation> {
    try {
      if (!key.startsWith(KEY_PREFIX)) {
        return { valid: false, error: 'Invalid key format' };
      }

      const keyPrefix = key.substring(0, 8);

      // Find potential matches by prefix
      const candidates = await prisma.apiKey.findMany({
        where: {
          keyPrefix,
          isActive: true,
        },
        include: {
          user: { select: { id: true, tier: true } },
        },
      });

      // Verify hash
      for (const candidate of candidates) {
        const matches = await bcrypt.compare(key, candidate.keyHash);
        if (matches) {
          // Check expiry
          if (candidate.expiresAt && candidate.expiresAt < new Date()) {
            return { valid: false, error: 'API key has expired' };
          }

          // Check rate limit
          const rateLimited = await this.checkRateLimit(candidate.id, candidate.rateLimit);
          if (rateLimited) {
            return { valid: false, error: 'Rate limit exceeded' };
          }

          // Update usage
          await prisma.apiKey.update({
            where: { id: candidate.id },
            data: {
              lastUsed: new Date(),
              usageCount: { increment: 1 },
            },
          });

          // Increment rate limit counter
          await this.incrementRateLimit(candidate.id);

          return {
            valid: true,
            userId: candidate.userId,
            keyId: candidate.id,
            permissions: candidate.permissions,
          };
        }
      }

      return { valid: false, error: 'Invalid API key' };
    } catch (error) {
      logger.error('Validate API key error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRateLimit(keyId: string, limit: number): Promise<boolean> {
    const redis = getRedis();
    if (!redis) {
      // If Redis unavailable, allow request
      return false;
    }

    try {
      const key = `ratelimit:apikey:${keyId}`;
      const count = await redis.get(key);
      return count !== null && parseInt(count, 10) >= limit;
    } catch {
      return false;
    }
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(keyId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      const key = `ratelimit:apikey:${keyId}`;
      const exists = await redis.exists(key);

      if (exists) {
        await redis.incr(key);
      } else {
        await redis.setEx(key, 3600, '1'); // 1 hour TTL
      }
    } catch (error) {
      logger.warn('Rate limit increment error:', error);
    }
  }

  /**
   * Get rate limit info for a key
   */
  public async getRateLimitInfo(keyId: string): Promise<{
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      return { limit: 0, remaining: 0, reset: 0 };
    }

    const redis = getRedis();
    let used = 0;

    if (redis) {
      try {
        const key = `ratelimit:apikey:${keyId}`;
        const count = await redis.get(key);
        used = count ? parseInt(count, 10) : 0;
      } catch {
        used = 0;
      }
    }

    // Calculate reset time (next hour)
    const now = new Date();
    const reset = new Date(now);
    reset.setMinutes(0, 0, 0);
    reset.setHours(reset.getHours() + 1);

    return {
      limit: apiKey.rateLimit,
      remaining: Math.max(0, apiKey.rateLimit - used),
      reset: Math.floor(reset.getTime() / 1000),
    };
  }

  /**
   * Get user's API keys
   */
  public async getUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      rateLimit: k.rateLimit,
      lastUsed: k.lastUsed,
      expiresAt: k.expiresAt,
      isActive: k.isActive,
      usageCount: k.usageCount,
      createdAt: k.createdAt,
    }));
  }

  /**
   * Update API key
   */
  public async updateApiKey(
    keyId: string,
    userId: string,
    updates: {
      name?: string;
      permissions?: string[];
      rateLimit?: number;
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, userId },
      });

      if (!apiKey) {
        return { success: false, error: 'API key not found' };
      }

      await prisma.apiKey.update({
        where: { id: keyId },
        data: updates,
      });

      return { success: true };
    } catch (error) {
      logger.error('Update API key error:', error);
      return { success: false, error: 'Failed to update API key' };
    }
  }

  /**
   * Revoke (delete) API key
   */
  public async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        where: { id: keyId, userId },
      });

      if (!apiKey) return false;

      await prisma.apiKey.delete({ where: { id: keyId } });
      logger.info(`API key revoked: ${apiKey.keyPrefix}...`);
      return true;
    } catch (error) {
      logger.error('Revoke API key error:', error);
      return false;
    }
  }

  /**
   * Rotate API key (create new, revoke old)
   */
  public async rotateApiKey(
    keyId: string,
    userId: string
  ): Promise<{ success: boolean; newKey?: string; error?: string }> {
    try {
      const oldKey = await prisma.apiKey.findFirst({
        where: { id: keyId, userId },
      });

      if (!oldKey) {
        return { success: false, error: 'API key not found' };
      }

      // Create new key with same settings
      const result = await this.createApiKey(userId, oldKey.name, {
        permissions: oldKey.permissions,
        rateLimit: oldKey.rateLimit,
      });

      if (!result.success) {
        return { success: false, error: 'Failed to create new key' };
      }

      // Revoke old key
      await prisma.apiKey.delete({ where: { id: keyId } });

      logger.info(`API key rotated: ${oldKey.keyPrefix}... -> ${result.keyInfo?.keyPrefix}...`);

      return {
        success: true,
        newKey: result.apiKey,
      };
    } catch (error) {
      logger.error('Rotate API key error:', error);
      return { success: false, error: 'Failed to rotate API key' };
    }
  }

  /**
   * Get API key usage statistics
   */
  public async getKeyUsageStats(
    keyId: string,
    userId: string
  ): Promise<{
    totalRequests: number;
    lastUsed?: Date | null;
    rateLimitInfo: { limit: number; remaining: number; reset: number };
  } | null> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) return null;

    const rateLimitInfo = await this.getRateLimitInfo(keyId);

    return {
      totalRequests: apiKey.usageCount,
      lastUsed: apiKey.lastUsed,
      rateLimitInfo,
    };
  }
}

// Export singleton
export const apiKeyService = new ApiKeyServiceClass();
export default apiKeyService;

/**
 * Database Configuration
 * PostgreSQL via Prisma and optional Redis caching
 * 
 * @module Database
 */

import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// ============================================
// Prisma Client (PostgreSQL)
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.server.isDevelopment ? ['error', 'warn'] : ['error'],
  });

if (config.server.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

// ============================================
// Redis Client (Optional Caching)
// ============================================

let redis: RedisClientType | null = null;
let redisConnected = false;
let redisAttempted = false;

/**
 * Connect to PostgreSQL via Prisma
 */
export const connectPostgreSQL = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected successfully via Prisma');
  } catch (error) {
    logger.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
};

/**
 * Connect to Redis for caching (optional - app works without it)
 */
export const connectRedis = async (): Promise<void> => {
  if (redisAttempted) return;
  redisAttempted = true;

  try {
    redis = createClient({
      url: config.database.redisUrl,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries >= 2) {
            return false; // Stop retrying after 2 attempts
          }
          return 500;
        },
      },
    });

    // Suppress error logging - Redis is optional
    redis.on('error', () => {
      if (redisConnected) {
        redisConnected = false;
      }
    });

    redis.on('connect', () => {
      redisConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    redis.on('end', () => {
      redisConnected = false;
    });

    await redis.connect();
  } catch {
    logger.warn('⚠️ Redis not available - running without cache (this is fine)');
    redis = null;
    redisConnected = false;
  }
};

/**
 * Get Redis client instance (may be null if not connected)
 */
export const getRedis = (): RedisClientType | null => {
  return redisConnected ? redis : null;
};

// Export redis for direct access
export { redis };

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => redisConnected;

/**
 * Disconnect all database connections
 */
export const disconnectDatabases = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected');

    if (redis && redisConnected) {
      await redis.quit();
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
  }
};

export default prisma;

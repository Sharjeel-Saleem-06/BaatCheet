import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// ============================================
// Database Connections
// ============================================

// Prisma Client (PostgreSQL)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.nodeEnv === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Redis Client
let redisClient: RedisClientType | null = null;
let redisConnected = false;

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
export const connectRedis = async (): Promise<RedisClientType | null> => {
  // Skip Redis connection in development if not available
  if (config.nodeEnv === 'development') {
    try {
      redisClient = createClient({
        url: config.redisUrl,
        socket: {
          connectTimeout: 3000, // 3 second timeout
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.warn('⚠️ Redis not available, continuing without cache');
              return false; // Stop retrying
            }
            return 1000; // Retry after 1 second
          },
        },
      });

      redisClient.on('error', () => {
        // Silently handle errors - Redis is optional
        if (redisConnected) {
          redisConnected = false;
          logger.warn('⚠️ Redis connection lost');
        }
      });

      redisClient.on('connect', () => {
        redisConnected = true;
        logger.info('✅ Redis connected successfully');
      });

      await redisClient.connect();
      return redisClient;
    } catch {
      logger.warn('⚠️ Redis not available, continuing without cache');
      redisClient = null;
      return null;
    }
  }

  // In production, try to connect with more retries
  try {
    redisClient = createClient({
      url: config.redisUrl,
    });

    redisClient.on('error', (err) => {
      logger.warn('⚠️ Redis Client Error:', err.message);
    });

    redisClient.on('connect', () => {
      redisConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis connection failed, continuing without cache:', error);
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance (may be null if not connected)
 */
export const getRedisClient = (): RedisClientType | null => {
  return redisConnected ? redisClient : null;
};

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
    
    if (redisClient && redisConnected) {
      await redisClient.quit();
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
  }
};

export default prisma;

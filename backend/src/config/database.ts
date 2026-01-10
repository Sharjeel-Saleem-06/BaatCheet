/**
 * Database Configuration
 * PostgreSQL via Prisma with connection pooling and optional Redis caching
 * 
 * @module Database
 */

import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// ============================================
// Prisma Client (PostgreSQL) with Connection Pooling
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure Prisma with optimized settings
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.server.isDevelopment 
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
    
    // Enable metrics in development
    // @ts-ignore - metrics is available in newer Prisma versions
    // metrics: config.server.isDevelopment,
  });

// Log slow queries in development
if (config.server.isDevelopment) {
  // @ts-ignore - event typing
  prisma.$on('query', (e: any) => {
    if (e.duration > 100) { // Log queries taking more than 100ms
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

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
 * Connect to PostgreSQL via Prisma with connection test
 */
export const connectPostgreSQL = async (): Promise<void> => {
  try {
    // Test connection with a simple query
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    
    logger.info('✅ PostgreSQL connected successfully via Prisma');
    
    // Log connection pool info
    logger.info(`   Connection URL: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
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
      url: config.redis.url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries >= 3) {
            logger.warn('Redis reconnection failed after 3 attempts');
            return false; // Stop retrying
          }
          return Math.min(retries * 500, 3000); // Exponential backoff
        },
      },
      // Connection pool settings
      // Note: node-redis handles pooling internally
    });

    // Suppress error logging - Redis is optional
    redis.on('error', (err) => {
      if (redisConnected) {
        logger.warn('Redis connection lost:', err.message);
        redisConnected = false;
      }
    });

    redis.on('connect', () => {
      redisConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    redis.on('end', () => {
      redisConnected = false;
    });

    await redis.connect();
    
    // Test connection
    await redis.ping();
    
  } catch (error) {
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
 * Disconnect all database connections gracefully
 */
export const disconnectDatabases = async (): Promise<void> => {
  logger.info('Disconnecting databases...');
  
  try {
    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected');

    // Disconnect Redis
    if (redis && redisConnected) {
      await redis.quit();
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
    
    // Force disconnect on error
    try {
      await prisma.$disconnect();
    } catch {}
    
    try {
      if (redis) await redis.disconnect();
    } catch {}
  }
};

/**
 * Health check for database connections
 */
export const checkDatabaseHealth = async (): Promise<{
  postgres: { connected: boolean; latency: number };
  redis: { connected: boolean; latency: number };
}> => {
  const result = {
    postgres: { connected: false, latency: 0 },
    redis: { connected: false, latency: 0 },
  };

  // Check PostgreSQL
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    result.postgres = {
      connected: true,
      latency: Date.now() - start,
    };
  } catch {
    result.postgres.connected = false;
  }

  // Check Redis
  if (redis && redisConnected) {
    try {
      const start = Date.now();
      await redis.ping();
      result.redis = {
        connected: true,
        latency: Date.now() - start,
      };
    } catch {
      result.redis.connected = false;
    }
  }

  return result;
};

export default prisma;

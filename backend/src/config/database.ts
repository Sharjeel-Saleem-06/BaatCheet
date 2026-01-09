import mongoose from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redisClient: RedisClientType | null = null;

// MongoDB Connection
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Redis Connection
export const connectRedis = async (): Promise<RedisClientType> => {
  try {
    redisClient = createClient({
      url: config.redisUrl,
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection error:', error);
    // Redis is optional - continue without it
    logger.warn('⚠️ Continuing without Redis cache');
    return null as unknown as RedisClientType;
  }
};

export const getRedisClient = (): RedisClientType | null => redisClient;

// Graceful shutdown
export const disconnectDatabases = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
    
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
  }
};

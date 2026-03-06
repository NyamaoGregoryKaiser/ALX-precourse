```typescript
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      database: parseInt(process.env.REDIS_DB || '0', 10), // Use database 0 by default
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.on('connect', () => logger.info('Redis Client Connected'));
    redisClient.on('reconnecting', () => logger.warn('Redis Client Reconnecting'));

    await redisClient.connect();
    logger.info('Successfully connected to Redis.');
  } catch (error) {
    logger.error('Could not connect to Redis', error);
    process.exit(1);
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient || !redisClient.isReady) {
    logger.error('Redis client not initialized or not ready. Please call connectRedis first.');
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient && redisClient.isReady) {
    await redisClient.quit();
    logger.info('Redis client disconnected.');
  }
};
```
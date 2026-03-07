```typescript
import { createClient } from 'redis';
import { REDIS_URL } from './env';
import logger from '../utils/logger';

let redisClient: ReturnType<typeof createClient>;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: REDIS_URL,
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.on('connect', () => logger.info('Redis Client Connected'));
    redisClient.on('reconnecting', () => logger.warn('Redis Client Reconnecting...'));

    await redisClient.connect();
    logger.info('Successfully connected to Redis.');
  } catch (error) {
    logger.error('Could not connect to Redis:', error);
    process.exit(1);
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

// Example usage for Prometheus metric increment
import { cacheOperationsTotal } from '../utils/prometheus';

export const setCache = async (key: string, value: string, ttlSeconds: number): Promise<void> => {
  try {
    await getRedisClient().setEx(key, ttlSeconds, value);
    cacheOperationsTotal.labels('set', 'success').inc();
  } catch (error) {
    cacheOperationsTotal.labels('set', 'failure').inc();
    logger.error(`Error setting cache for key ${key}:`, error);
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  try {
    const value = await getRedisClient().get(key);
    if (value) {
      cacheOperationsTotal.labels('get', 'hit').inc();
    } else {
      cacheOperationsTotal.labels('get', 'miss').inc();
    }
    return value;
  } catch (error) {
    cacheOperationsTotal.labels('get', 'failure').inc();
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<number> => {
  try {
    const result = await getRedisClient().del(key);
    cacheOperationsTotal.labels('delete', 'success').inc();
    return result;
  } catch (error) {
    cacheOperationsTotal.labels('delete', 'failure').inc();
    logger.error(`Error deleting cache for key ${key}:`, error);
    return 0;
  }
};
```
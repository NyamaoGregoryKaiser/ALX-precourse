```typescript
import { createClient } from 'redis';
import { env } from '../config/env';
import { logger } from './logger';

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// Example usage for caching
export const cacheSet = async (key: string, value: any, expiresInSeconds: number = 3600): Promise<void> => {
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: expiresInSeconds });
    logger.debug(`Cache set for key: ${key}`);
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(data) as T;
    }
    logger.debug(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

export const cacheDel = async (key: string | string[]): Promise<void> => {
  try {
    await redisClient.del(key);
    logger.debug(`Cache deleted for key(s): ${key}`);
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
  }
};

export const cacheDelByPattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug(`Cache deleted by pattern: ${pattern} (keys: ${keys.join(', ')})`);
    }
  } catch (error) {
    logger.error(`Error deleting cache by pattern ${pattern}:`, error);
  }
};
```
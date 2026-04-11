```typescript
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../utils/redisClient';
import logger from '../utils/logger';

// Cache middleware for GET requests
export const cacheMiddleware = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      logger.debug(`No caching for method: ${req.method}`);
      return next();
    }

    const key = req.originalUrl;
    try {
      const cachedResponse = await redisClient.get(key);

      if (cachedResponse) {
        logger.info(`Cache hit for ${key}`);
        return res.status(200).json(JSON.parse(cachedResponse));
      }

      // If no cache, proceed to the route handler and cache its response
      const originalSend = res.json;
      res.json = (body: any): Response<any, Record<string, any>> => {
        redisClient.setEx(key, durationInSeconds, JSON.stringify(body))
          .catch(error => logger.error(`Error caching response for ${key}:`, error));
        return originalSend.call(res, body);
      };

      next();
    } catch (error) {
      logger.error(`Redis cache error for ${key}:`, error);
      next(); // Continue without caching if Redis has an issue
    }
  };
};

// Utility to clear specific cache keys
export const clearCache = async (key: string): Promise<number> => {
    try {
        const deletedCount = await redisClient.del(key);
        if (deletedCount > 0) {
            logger.info(`Cache cleared for key: ${key}`);
        } else {
            logger.info(`No cache found for key: ${key}`);
        }
        return deletedCount;
    } catch (error) {
        logger.error(`Error clearing cache for key ${key}:`, error);
        return 0;
    }
};

// Utility to clear all cache keys that start with a prefix
export const clearCacheByPrefix = async (prefix: string): Promise<number> => {
    try {
        const keys = await redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
            const deletedCount = await redisClient.del(keys);
            logger.info(`Cache cleared for prefix '${prefix}'. Deleted ${deletedCount} keys.`);
            return deletedCount;
        } else {
            logger.info(`No cache keys found for prefix '${prefix}'.`);
            return 0;
        }
    } catch (error) {
        logger.error(`Error clearing cache by prefix '${prefix}':`, error);
        return 0;
    }
};
```
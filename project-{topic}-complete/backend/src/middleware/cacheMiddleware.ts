```typescript
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';

/**
 * Caching middleware for GET requests.
 * Caches response for a specified duration in Redis.
 * @param duration - Cache duration in seconds.
 */
export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      logger.debug(`Skipping cache for non-GET request: ${req.method} ${req.originalUrl}`);
      return next();
    }

    const key = req.originalUrl;
    try {
      const cachedBody = await redisClient.get(key);

      if (cachedBody) {
        logger.debug(`Cache hit for key: ${key}`);
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cachedBody));
      } else {
        logger.debug(`Cache miss for key: ${key}`);
        res.setHeader('X-Cache', 'MISS');
        // Monkey-patch res.json to cache the response
        const originalJson = res.json;
        res.json = (body: any): Response => {
          redisClient.setEx(key, duration, JSON.stringify(body))
            .then(() => logger.debug(`Cached key: ${key} for ${duration} seconds`))
            .catch(cacheErr => logger.error(`Error caching data for key ${key}:`, cacheErr));
          return originalJson.call(res, body);
        };
        next();
      }
    } catch (error) {
      logger.error(`Error accessing Redis cache for key ${key}:`, error);
      // If Redis is down or errors, continue without caching
      next();
    }
  };
};

/**
 * Middleware to clear cache for specific keys or patterns.
 * To be used on routes that modify data (POST, PUT, DELETE).
 * @param keysOrPatterns - An array of cache keys or glob patterns to clear (e.g., ['/api/v1/products*', '/api/v1/categories']).
 */
export const clearCacheMiddleware = (keysOrPatterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const pattern of keysOrPatterns) {
        if (pattern.endsWith('*')) {
          // Clear multiple keys matching a pattern
          const matchingKeys = await redisClient.keys(pattern);
          if (matchingKeys.length > 0) {
            await redisClient.del(matchingKeys);
            logger.debug(`Cleared cache keys matching pattern: ${pattern}`);
          }
        } else {
          // Clear a single specific key
          await redisClient.del(pattern);
          logger.debug(`Cleared specific cache key: ${pattern}`);
        }
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
      // Continue processing even if cache clearing fails
    } finally {
      next();
    }
  };
};
```
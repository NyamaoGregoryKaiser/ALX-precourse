import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redisClient';
import logger from '../utils/logger';

const redisClient = getRedisClient();

interface CacheOptions {
  keyPrefix: string;
  ttlSeconds: number;
}

/**
 * Middleware for caching GET requests.
 * @param options - Cache configuration like key prefix and TTL.
 */
export const cacheMiddleware = (options: CacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${options.keyPrefix}:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        logger.debug(`Cache hit for key: ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      // If no cache, override res.json to cache the response before sending
      const originalJson = res.json;
      res.json = (body: any): Response => {
        redisClient.setEx(key, options.ttlSeconds, JSON.stringify(body))
          .catch(err => logger.error(`Failed to set cache for key ${key}:`, err));
        logger.debug(`Cache set for key: ${key} with TTL: ${options.ttlSeconds}s`);
        return originalJson.call(res, body);
      };
      next();
    } catch (err) {
      logger.error(`Redis caching error for key ${key}:`, err);
      next(); // Continue without caching if Redis is down or errors
    }
  };
};

/**
 * Utility function to invalidate cache for a given key prefix.
 * @param keyPrefix - The prefix of the keys to invalidate.
 */
export const invalidateCache = async (keyPrefix: string) => {
  try {
    const keys = await redisClient.keys(`${keyPrefix}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Invalidated cache for keys with prefix: ${keyPrefix}`);
    }
  } catch (err) {
    logger.error(`Error invalidating cache for prefix ${keyPrefix}:`, err);
  }
};
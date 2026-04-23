import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

const redisClient = new Redis(config.redisUrl);

export const cacheMiddleware = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = '__express__' + req.originalUrl || req.url;
    req.cacheKey = key; // Attach cache key to request for potential later use (e.g., cache invalidation)

    try {
      const cachedBody = await redisClient.get(key);
      if (cachedBody) {
        logger.debug(`Cache hit for ${key}`);
        return res.send(JSON.parse(cachedBody));
      } else {
        logger.debug(`Cache miss for ${key}`);
        const originalSend = res.send;
        res.send = (body: any) => {
          redisClient.setex(key, durationInSeconds, JSON.stringify(body));
          originalSend.call(res, body);
          return res;
        };
        next();
      }
    } catch (error) {
      logger.error('Redis cache error:', error);
      next(); // Continue without caching on error
    }
  };
};

export const invalidateCache = async (key: string | string[]) => {
  try {
    if (Array.isArray(key)) {
      await redisClient.del(...key.map(k => `__express__${k}`));
      logger.info(`Invalidated multiple cache keys: ${key.join(', ')}`);
    } else {
      await redisClient.del(`__express__${key}`);
      logger.info(`Invalidated cache key: ${key}`);
    }
  } catch (error) {
    logger.error('Failed to invalidate cache:', error);
  }
};
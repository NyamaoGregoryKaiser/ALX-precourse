```typescript
import Redis from 'ioredis';
import { env } from '../config';
import logger from '../utils/logger';

class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  private defaultTTL: number = env.CACHE_TTL_SECONDS; // Default TTL from config

  constructor() {
    this.redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      lazyConnect: true, // Don't connect until a command is issued
      maxRetriesPerRequest: 5, // Retry up to 5 times
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000); // Exponential backoff, max 2 seconds
        logger.warn(`Redis: Retrying connection attempt ${times}. Delaying ${delay}ms...`);
        return delay;
      }
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis cache connected successfully!');
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      logger.error('Redis cache connection error:', err);
    });

    this.redis.on('ready', () => {
      logger.info('Redis client is ready to use.');
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed.');
    });
  }

  /**
   * Get a value from the cache.
   * @param key The key to retrieve.
   * @returns The cached value or null if not found or Redis is not connected.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.debug(`Redis not connected. Skipping cache get for key: ${key}`);
      return null;
    }
    try {
      const data = await this.redis.get(key);
      if (data) {
        logger.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(data) as T;
      }
      logger.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Error getting from Redis for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in the cache.
   * @param key The key to store.
   * @param value The value to store.
   * @param ttlSeconds Time-to-live in seconds. Defaults to `env.CACHE_TTL_SECONDS`.
   */
  async set(key: string, value: any, ttlSeconds: number = this.defaultTTL): Promise<void> {
    if (!this.isConnected) {
      logger.debug(`Redis not connected. Skipping cache set for key: ${key}`);
      return;
    }
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      logger.debug(`Cache SET for key: ${key} with TTL: ${ttlSeconds}s`);
    } catch (error) {
      logger.error(`Error setting to Redis for key ${key}:`, error);
    }
  }

  /**
   * Delete a key from the cache.
   * @param key The key to delete.
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      logger.debug(`Redis not connected. Skipping cache del for key: ${key}`);
      return;
    }
    try {
      await this.redis.del(key);
      logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      logger.error(`Error deleting from Redis for key ${key}:`, error);
    }
  }

  /**
   * Clear all keys in the current Redis database. Use with caution in production.
   */
  async flushAll(): Promise<void> {
    if (!this.isConnected) {
      logger.debug('Redis not connected. Skipping cache flush.');
      return;
    }
    try {
      await this.redis.flushall();
      logger.info('Redis cache flushed.');
    } catch (error) {
      logger.error('Error flushing Redis cache:', error);
    }
  }

  /**
   * Middleware to cache responses for GET requests.
   * @param keyPrefix Prefix for the cache key, often related to the resource (e.g., 'users', 'products').
   * @param ttlSeconds Optional custom TTL for this specific middleware usage.
   */
  cacheMiddleware = (keyPrefix: string, ttlSeconds: number = this.defaultTTL) => {
    return async (req: any, res: any, next: any) => {
      if (req.method !== 'GET') {
        return next();
      }

      const originalSend = res.send;
      const cacheKey = `${keyPrefix}:${req.user?.id}:${req.originalUrl}`; // Include user ID for user-specific data

      try {
        const cachedResponse = await this.get(cacheKey);
        if (cachedResponse) {
          res.status(200).json(cachedResponse);
          return;
        }

        res.send = (body: any) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.set(cacheKey, JSON.parse(body), ttlSeconds);
          }
          originalSend.call(res, body);
        };
        next();
      } catch (error) {
        logger.error(`Cache middleware error for key ${cacheKey}:`, error);
        next(); // Proceed without caching if there's a cache error
      }
    };
  };
}

export const cacheService = new CacheService();
```
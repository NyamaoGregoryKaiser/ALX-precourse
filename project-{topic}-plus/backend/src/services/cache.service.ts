```typescript
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class CacheService {
  private redisClient: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      lazyConnect: true, // Only connect when a command is issued
      maxRetriesPerRequest: null, // Unlimited retries for requests
      reconnectOnError: (err) => {
        logger.error('Redis reconnectOnError:', err.message);
        const targetErrors = [/READONLY/, /ETIMEDOUT/];
        targetErrors.forEach((targetError) => {
          if (targetError.test(err.message)) {
            return true;
          }
        });
        return false;
      },
    });

    this.redisClient.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected.');
    });

    this.redisClient.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis client error:', error);
    });

    this.redisClient.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis client ready.');
    });

    this.redisClient.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client disconnected.');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected. Skipping cache get operation for key:', key);
      return null;
    }
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Error getting data from Redis for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlInSeconds: number = 3600): Promise<void> { // Default 1 hour TTL
    if (!this.isConnected) {
      logger.warn('Redis not connected. Skipping cache set operation for key:', key);
      return;
    }
    try {
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlInSeconds);
    } catch (error) {
      logger.error(`Error setting data to Redis for key ${key}:`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected. Skipping cache del operation for key(s):', key);
      return;
    }
    try {
      await this.redisClient.del(key);
    } catch (error) {
      logger.error(`Error deleting data from Redis for key(s) ${key}:`, error);
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected. Skipping flushAll operation.');
      return;
    }
    try {
      await this.redisClient.flushall();
      logger.info('Redis cache flushed.');
    } catch (error) {
      logger.error('Error flushing Redis cache:', error);
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  isConnectedToRedis(): boolean {
    return this.isConnected;
  }
}

export const cacheService = new CacheService();
```
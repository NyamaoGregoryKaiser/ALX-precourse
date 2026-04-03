```typescript
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RedisService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get data from Redis cache.
   * @param key The cache key.
   * @returns The cached data or null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.cacheManager.get<T>(key);
      if (data) {
        this.logger.debug(`Cache GET success for key: ${key}`, 'RedisService');
      } else {
        this.logger.debug(`Cache GET miss for key: ${key}`, 'RedisService');
      }
      return data;
    } catch (error) {
      this.logger.error(
        `Error getting from Redis for key: ${key}: ${error.message}`,
        error.stack,
        'RedisService',
      );
      return null;
    }
  }

  /**
   * Set data to Redis cache.
   * @param key The cache key.
   * @param value The data to cache.
   * @param ttlSeconds Time to live in seconds (optional, defaults to module config).
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.cacheManager.set(key, value, ttlSeconds);
        this.logger.debug(`Cache SET success for key: ${key} with TTL: ${ttlSeconds}s`, 'RedisService');
      } else {
        await this.cacheManager.set(key, value);
        this.logger.debug(`Cache SET success for key: ${key} (default TTL)`, 'RedisService');
      }
    } catch (error) {
      this.logger.error(
        `Error setting to Redis for key: ${key}: ${error.message}`,
        error.stack,
        'RedisService',
      );
    }
  }

  /**
   * Delete data from Redis cache.
   * @param key The cache key.
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL success for key: ${key}`, 'RedisService');
    } catch (error) {
      this.logger.error(
        `Error deleting from Redis for key: ${key}: ${error.message}`,
        error.stack,
        'RedisService',
      );
    }
  }

  /**
   * Reset (clear all) the Redis cache. Use with caution in production.
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.warn('Redis cache RESET command executed.', 'RedisService');
    } catch (error) {
      this.logger.error(
        `Error resetting Redis cache: ${error.message}`,
        error.stack,
        'RedisService',
      );
    }
  }
}
```
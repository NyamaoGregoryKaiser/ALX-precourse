```typescript
import { createClient, RedisClientType } from 'redis';
import config from '../config';
import logger from './logger.service';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      this.client = createClient({
        url: `redis://${config.redis.host}:${config.redis.port}`,
      });

      this.client.on('error', (err) => logger.error('Redis Client Error', err));
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis client connected.');
      });
      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('Redis client disconnected.');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Could not connect to Redis', error);
      this.isConnected = false;
    }
  }

  /**
   * Sets a value in the cache.
   * @param key The cache key.
   * @param value The value to store. Can be an object, will be stringified.
   * @param ttlSeconds Time to live in seconds (optional).
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      logger.warn('Redis not connected. Skipping cache set operation.');
      return;
    }
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      logger.debug(`Cache SET: ${key}`);
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Gets a value from the cache.
   * @param key The cache key.
   * @returns {Promise<any | null>} The cached value (parsed if JSON) or null if not found/error.
   */
  async get(key: string): Promise<any | null> {
    if (!this.isConnected || !this.client) {
      logger.warn('Redis not connected. Skipping cache get operation.');
      return null;
    }
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache GET: ${key}`);
        try {
          return JSON.parse(value); // Try parsing if it was an object
        } catch {
          return value; // Return as string if not JSON
        }
      }
      return null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Deletes a key from the cache.
   * @param key The cache key to delete.
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      logger.warn('Redis not connected. Skipping cache del operation.');
      return;
    }
    try {
      await this.client.del(key);
      logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Checks if the cache is connected.
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Closes the Redis connection.
   */
  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        logger.info('Redis client disconnected gracefully.');
      } catch (error) {
        logger.error('Error closing Redis client:', error);
      }
    }
  }
}

const cacheService = new CacheService();
export default cacheService;
```

#### `backend/src/services/logger.service.ts`
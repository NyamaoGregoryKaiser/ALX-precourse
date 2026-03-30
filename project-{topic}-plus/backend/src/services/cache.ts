import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

export class RedisService {
  private static client: RedisClientType;

  static async connect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      logger.info('Redis client already connected.');
      return;
    }

    try {
      this.client = createClient({
        url: `redis://${config.redis.host}:${config.redis.port}`,
        // password: config.redis.password, // Uncomment if Redis requires password
      });

      this.client.on('error', (err) => logger.error('Redis Client Error', err));
      this.client.on('connect', () => logger.info('Redis Client Connected'));
      this.client.on('reconnecting', () => logger.warn('Redis Client Reconnecting'));
      this.client.on('end', () => logger.info('Redis Client Disconnected'));

      await this.client.connect();
      logger.info('Redis client connected successfully.');
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      // Depending on your application, you might want to exit or handle gracefully
      throw error;
    }
  }

  static getClient(): RedisClientType {
    if (!this.client || !this.client.isOpen) {
      // In a real application, you might want to throw an error or attempt reconnection
      // For simplicity, ensure connect() is called before using getClient()
      logger.warn('Redis client not connected. Attempting to connect...');
      this.connect().catch(err => logger.error('Failed to reconnect to Redis from getClient', err));
      // Fallback: If not connected, return a dummy client or throw
      // For robust error handling, make sure connect() is awaited at app startup.
      if (!this.client) {
         throw new Error('Redis client not initialized.');
      }
    }
    return this.client;
  }

  static async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      logger.info('Redis client disconnected.');
    }
  }

  // --- Cache Specific Methods ---

  /**
   * Set a key-value pair in Redis with an optional expiration time.
   * @param key The cache key.
   * @param value The value to store (will be JSON.stringified).
   * @param ttlSeconds Time-to-live in seconds.
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<string | null> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttlSeconds) {
        return await this.getClient().setEx(key, ttlSeconds, stringValue);
      } else {
        return await this.getClient().set(key, stringValue);
      }
    } catch (error) {
      logger.error(`Error setting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get a value from Redis and parse it as JSON.
   * @param key The cache key.
   * @returns The parsed value or null if not found/error.
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const stringValue = await this.getClient().get(key);
      if (stringValue) {
        return JSON.parse(stringValue) as T;
      }
      return null;
    } catch (error) {
      logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from Redis.
   * @param key The cache key.
   * @returns The number of keys removed.
   */
  static async del(key: string): Promise<number> {
    try {
      return await this.getClient().del(key);
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Clear all keys in the current Redis database. Use with extreme caution.
   */
  static async clearAll(): Promise<string> {
    try {
      return await this.getClient().flushAll();
    } catch (error) {
      logger.error('Error clearing all cache:', error);
      return 'ERROR';
    }
  }
}
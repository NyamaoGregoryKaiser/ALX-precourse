```javascript
import { createClient } from 'redis';
import config from '../config/index.js';
import logger from '../config/logger.js';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));
redisClient.on('reconnecting', () => logger.warn('Redis Client Reconnecting...'));
redisClient.on('end', () => logger.info('Redis Client Disconnected'));

let isConnected = false;

async function connectRedis() {
  if (!isConnected) {
    try {
      await redisClient.connect();
      isConnected = true;
    } catch (err) {
      logger.error('Failed to connect to Redis:', err.message);
      // In a production scenario, you might want to implement retry logic or fail gracefully
      // For now, we'll let other operations fail if connection isn't established.
    }
  }
}

// Connect Redis on startup
connectRedis();

/**
 * Utility for interacting with Redis cache.
 */
class Cache {
  /**
   * Sets a key-value pair in Redis with an optional expiration.
   * @param {string} key - The cache key.
   * @param {string} value - The value to store.
   * @param {number} [expirationInSeconds] - Optional expiration time in seconds.
   * @returns {Promise<string|null>} 'OK' on success, null on failure.
   */
  async set(key, value, expirationInSeconds = null) {
    if (!isConnected) {
      logger.warn('Redis not connected. Skipping cache set operation.');
      return null;
    }
    try {
      if (expirationInSeconds) {
        return await redisClient.set(key, value, { EX: expirationInSeconds });
      }
      return await redisClient.set(key, value);
    } catch (err) {
      logger.error(`Error setting cache key "${key}":`, err);
      return null;
    }
  }

  /**
   * Gets the value associated with a key from Redis.
   * @param {string} key - The cache key.
   * @returns {Promise<string|null>} The stored value, or null if key not found or error.
   */
  async get(key) {
    if (!isConnected) {
      logger.warn('Redis not connected. Skipping cache get operation.');
      return null;
    }
    try {
      return await redisClient.get(key);
    } catch (err) {
      logger.error(`Error getting cache key "${key}":`, err);
      return null;
    }
  }

  /**
   * Deletes one or more keys from Redis.
   * @param {string|string[]} keys - The key(s) to delete.
   * @returns {Promise<number>} The number of keys that were removed.
   */
  async del(keys) {
    if (!isConnected) {
      logger.warn('Redis not connected. Skipping cache del operation.');
      return 0;
    }
    try {
      return await redisClient.del(keys);
    } catch (err) {
      logger.error(`Error deleting cache key(s) "${keys}":`, err);
      return 0;
    }
  }

  /**
   * Pushes one or multiple values to the tail of a list. Creates the list if it doesn't exist.
   * @param {string} key - The list key.
   * @param {string|string[]} values - The value(s) to push.
   * @returns {Promise<number>} The length of the list after the push operation.
   */
  async rpush(key, values) {
    if (!isConnected) {
      logger.warn('Redis not connected. Skipping cache rpush operation.');
      return 0;
    }
    try {
      return await redisClient.rPush(key, values);
    } catch (err) {
      logger.error(`Error rpushing to list "${key}":`, err);
      return 0;
    }
  }

  /**
   * Returns a range of elements from the list stored at key.
   * @param {string} key - The list key.
   * @param {number} start - The starting index.
   * @param {number} stop - The stopping index.
   * @returns {Promise<string[]>} An array of elements.
   */
  async lrange(key, start, stop) {
    if (!isConnected) {
      logger.warn('Redis not connected. Skipping cache lrange operation.');
      return [];
    }
    try {
      return await redisClient.lRange(key, start, stop);
    } catch (err) {
      logger.error(`Error lrange for list "${key}":`, err);
      return [];
    }
  }

  /**
   * Sets the expiration of a key.
   * @param {string} key - The key to set expiration for.
   * @param {number} seconds - The expiration time in seconds.
   * @returns {Promise<boolean>} True if expiration was set, false otherwise.
   */
  async expire(key, seconds) {
    if (!isConnected) {
      logger.warn('Redis not connected. Skipping cache expire operation.');
      return false;
    }
    try {
      return await redisClient.expire(key, seconds);
    } catch (err) {
      logger.error(`Error setting expiration for key "${key}":`, err);
      return false;
    }
  }

  /**
   * Returns the Redis client instance for direct operations if needed.
   * @returns {import('redis').RedisClientType} The Redis client instance.
   */
  getClient() {
    return redisClient;
  }
}

export default new Cache();
```
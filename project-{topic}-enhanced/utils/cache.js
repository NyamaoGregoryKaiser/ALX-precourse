```javascript
const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('./logger');

let redisClient;

const initRedis = () => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // Unlimited retries for requests
    // Other options like TLS/SSL if needed for production
  });

  redisClient.on('connect', () => logger.info('Redis client connected to server.'));
  redisClient.on('ready', () => logger.info('Redis client is ready.'));
  redisClient.on('error', (err) => logger.error(`Redis client error: ${err.message}`, err));
  redisClient.on('end', () => logger.warn('Redis client disconnected from server.'));

  return redisClient;
};

// Initialize client on module load
initRedis();

const cache = {
  client: redisClient, // Expose client for direct use if needed (e.g., in server.js)

  /**
   * Get a value from Redis cache.
   * @param {string} key
   * @returns {Promise<string|null>} Cached value or null if not found.
   */
  get: async (key) => {
    if (!redisClient.status === 'ready') {
      logger.warn('Redis client not ready. Skipping cache get operation.');
      return null;
    }
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis: ${error.message}`, error);
      return null;
    }
  },

  /**
   * Set a value in Redis cache with an optional TTL.
   * @param {string} key
   * @param {string} value
   * @param {number} ttlSeconds Time to live in seconds. Default 3600 (1 hour).
   * @returns {Promise<string|null>} 'OK' on success, null on failure.
   */
  set: async (key, value, ttlSeconds = 3600) => {
    if (!redisClient.status === 'ready') {
      logger.warn('Redis client not ready. Skipping cache set operation.');
      return null;
    }
    try {
      if (ttlSeconds > 0) {
        return await redisClient.setex(key, ttlSeconds, value);
      } else {
        return await redisClient.set(key, value);
      }
    } catch (error) {
      logger.error(`Error setting key ${key} in Redis: ${error.message}`, error);
      return null;
    }
  },

  /**
   * Delete a key from Redis cache.
   * @param {string} key
   * @returns {Promise<number>} Number of keys deleted.
   */
  del: async (key) => {
    if (!redisClient.status === 'ready') {
      logger.warn('Redis client not ready. Skipping cache del operation.');
      return 0;
    }
    try {
      return await redisClient.del(key);
    } catch (error) {
      logger.error(`Error deleting key ${key} from Redis: ${error.message}`, error);
      return 0;
    }
  },

  /**
   * Delete keys matching a pattern. Use with caution in production as it can be slow on large datasets.
   * @param {string} pattern
   * @returns {Promise<number>} Number of keys deleted.
   */
  delPattern: async (pattern) => {
    if (!redisClient.status === 'ready') {
      logger.warn('Redis client not ready. Skipping cache delPattern operation.');
      return 0;
    }
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        return await redisClient.del(keys);
      }
      return 0;
    } catch (error) {
      logger.error(`Error deleting pattern ${pattern} from Redis: ${error.message}`, error);
      return 0;
    }
  },
};

module.exports = cache;
```
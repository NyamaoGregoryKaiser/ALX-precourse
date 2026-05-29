```javascript
const redis = require('redis');
const config = require('../config/config');
const logger = require('../config/logger');

let redisClient;

/**
 * Initializes the Redis client.
 * Attempts to connect and logs success or failure.
 */
const initializeRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: `redis://${config.redis.host}:${config.redis.port}`,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    await redisClient.connect();
    logger.info('Redis client connected successfully!');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // In a production environment, you might want to handle this gracefully
    // by falling back to no caching or retrying. For now, we'll log and continue.
    redisClient = null; // Ensure client is null if connection fails
  }
};

/**
 * Get data from Redis cache.
 * @param {string} key - The cache key.
 * @returns {Promise<string|null>} The cached data as a string, or null if not found.
 */
const getCache = async (key) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready, skipping cache read.');
    return null;
  }
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error(`Error getting cache for key ${key}: ${error.message}`);
    return null;
  }
};

/**
 * Set data to Redis cache.
 * @param {string} key - The cache key.
 * @param {any} value - The data to cache. Will be stringified if not a string.
 * @param {number} [ttlSeconds] - Time to live in seconds. Defaults to a short period.
 * @returns {Promise<void>}
 */
const setCache = async (key, value, ttlSeconds = 60) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready, skipping cache write.');
    return;
  }
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, ttlSeconds, stringValue);
  } catch (error) {
    logger.error(`Error setting cache for key ${key}: ${error.message}`);
  }
};

/**
 * Delete a specific key from Redis cache.
 * @param {string} key - The cache key to delete.
 * @returns {Promise<void>}
 */
const clearCache = async (key) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready, skipping cache clear.');
    return;
  }
  try {
    await redisClient.del(key);
    logger.debug(`Cache cleared for key: ${key}`);
  } catch (error) {
    logger.error(`Error clearing cache for key ${key}: ${error.message}`);
  }
};

/**
 * Clear all cache keys matching a pattern.
 * Use with caution, especially in production.
 * @param {string} pattern - The pattern to match (e.g., '/products*').
 * @returns {Promise<void>}
 */
const clearCacheByPattern = async (pattern) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready, skipping cache clear by pattern.');
    return;
  }
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache by pattern ${pattern}: ${error.message}`);
  }
};

module.exports = {
  initializeRedis,
  getCache,
  setCache,
  clearCache,
  clearCacheByPattern,
};
```
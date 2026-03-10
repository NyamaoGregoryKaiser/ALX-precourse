```javascript
const redisClient = require('../config/redis');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Middleware to cache responses using Redis.
 * Caches GET requests based on URL.
 * @param {string} keyPrefix - Prefix for the Redis key.
 * @param {number} ttl - Time-to-live for the cache entry in seconds. Defaults to config.cache.ttl.
 */
const cacheMiddleware = (keyPrefix, ttl = config.cache.ttl) => async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = `${keyPrefix}:${req.originalUrl}`;

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      logger.debug(`Cache HIT for key: ${key}`);
      return res.status(200).json(JSON.parse(cachedData));
    }
    logger.debug(`Cache MISS for key: ${key}`);

    // If no cache, override res.send to cache the response before sending
    const originalSend = res.send;
    res.send = function (body) {
      redisClient.set(key, body, { EX: ttl })
        .then(() => logger.debug(`Cached data for key: ${key}`))
        .catch(err => logger.error(`Failed to cache data for key: ${key}`, err));
      originalSend.apply(res, arguments);
    };
    next();
  } catch (err) {
    logger.error('Redis cache error:', err);
    next(); // Continue without caching if Redis fails
  }
};

/**
 * Utility to clear cache entries.
 * @param {string} keyPattern - Pattern to match keys (e.g., 'posts:*', 'users:*').
 */
const clearCache = async (keyPattern) => {
  try {
    const keys = await redisClient.keys(keyPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleared cache keys matching pattern: ${keyPattern}`);
    } else {
      logger.debug(`No cache keys found for pattern: ${keyPattern}`);
    }
  } catch (err) {
    logger.error(`Failed to clear cache for pattern ${keyPattern}:`, err);
  }
};

module.exports = { cacheMiddleware, clearCache };
```
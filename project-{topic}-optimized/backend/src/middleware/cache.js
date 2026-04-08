const redisClient = require('../config/redis');
const logger = require('../config/logger');

const DEFAULT_EXPIRATION = 3600; // 1 hour

const cacheMiddleware = (keyPrefix, expiration = DEFAULT_EXPIRATION) => async (req, res, next) => {
  // Generate a unique cache key based on the request URL
  const cacheKey = `${keyPrefix}:${req.originalUrl}`;

  try {
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    // If no cache hit, proceed to the route handler
    // And intercept the response to cache it
    const originalSend = res.send;
    res.send = (body) => {
      // Only cache successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.debug(`Caching response for key: ${cacheKey} with expiration ${expiration}s`);
        redisClient.set(cacheKey, body, 'EX', expiration)
          .catch((err) => logger.error(`Error setting cache for key ${cacheKey}: ${err.message}`));
      }
      originalSend.call(res, body);
    };

    next();
  } catch (error) {
    logger.error(`Error in cache middleware for key ${cacheKey}: ${error.message}`, { error });
    // If Redis is down or error, bypass cache and proceed
    next();
  }
};

/**
 * Utility function to clear cache entries based on a pattern.
 * Use with caution, especially in high-traffic scenarios.
 * @param {string} pattern - Glob-style pattern (e.g., 'products:*')
 */
const clearCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
    } else {
      logger.info(`No cache keys found matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache for pattern ${pattern}: ${error.message}`, { error });
  }
};


module.exports = {
  cacheMiddleware,
  clearCache,
};
```
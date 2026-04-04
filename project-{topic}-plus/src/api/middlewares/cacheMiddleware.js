```javascript
const { redisClient } = require('../../config/redis');
const config = require('../../config');
const logger = require('../../config/logger');

/**
 * Caching middleware for API responses using Redis.
 * Caches GET requests based on URL, query parameters, and user ID.
 * Supports clearing cache after specific mutation operations.
 */
const cacheMiddleware = (options = {}) => {
  const { ttl = config.redis.cacheTTLSeconds } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a unique cache key for the request
    // Include user ID to ensure cached data is user-specific
    // Include query params for different filtered results
    const userId = req.user ? req.user.id : 'guest'; // Assuming req.user is populated by authMiddleware
    const cacheKey = `cache:${userId}:${req.originalUrl}`;

    try {
      const cachedResponse = await redisClient.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache HIT for key: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedResponse));
      } else {
        logger.debug(`Cache MISS for key: ${cacheKey}`);
        // Monkey patch res.json to cache the response before sending
        const originalJson = res.json;
        res.json = (body) => {
          // Cache the response with an expiration time
          redisClient.set(cacheKey, JSON.stringify(body), { EX: ttl })
            .catch(err => logger.error('Error setting cache:', err));
          return originalJson.call(res, body);
        };
        next();
      }
    } catch (err) {
      logger.error('Redis cache error:', err);
      // If Redis is down or errors, just bypass cache and continue to next middleware
      next();
    }
  };
};

/**
 * Middleware to clear cache keys associated with a user or globally.
 * Intended to be used after PUT, POST, DELETE operations that modify data.
 * @param {string[]} [patterns] - An array of glob patterns to match cache keys.
 *                                If not provided, clears keys associated with req.user.id.
 */
cacheMiddleware.clear = (patterns) => {
  return async (req, res, next) => {
    try {
      let keysToDelete = [];

      if (patterns && patterns.length > 0) {
        // Clear specific patterns (e.g., ['cache:*:users', 'cache:*:tasks:*'])
        for (const pattern of patterns) {
          const keys = await redisClient.keys(pattern);
          keysToDelete.push(...keys);
        }
      } else if (req.user && req.user.id) {
        // Clear all cache keys related to the current user
        keysToDelete = await redisClient.keys(`cache:${req.user.id}:*`);
      } else {
        // If no user or patterns, don't clear anything specific
        logger.warn('No specific cache keys to clear and no user ID available.');
        return next();
      }

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
        logger.debug(`Cleared ${keysToDelete.length} cache keys.`);
      }

      next();
    } catch (err) {
      logger.error('Error clearing cache:', err);
      next(); // Continue even if cache clearing fails
    }
  };
};

module.exports = cacheMiddleware;
```
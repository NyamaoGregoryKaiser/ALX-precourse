const redisClient = require('../config/redis');
const logger = require('../config/logger');
const AppError = require('../utils/appError');

/**
 * Caching middleware for GET requests.
 * Caches response for a specific duration based on URL and user.
 *
 * @param {number} duration - Cache duration in seconds.
 * @returns {Function} Express middleware.
 */
const cache = (duration) => async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const userId = req.user ? req.user.id : 'guest'; // Cache differently for each user or for public content
  const key = `cache:${userId}:${req.originalUrl}`;

  try {
    const cachedBody = await redisClient.get(key);
    if (cachedBody) {
      logger.debug(`Cache hit for key: ${key}`);
      return res.send(JSON.parse(cachedBody));
    } else {
      logger.debug(`Cache miss for key: ${key}`);
      // Override res.send to cache the response
      const originalSend = res.send;
      res.send = (body) => {
        redisClient.setEx(key, duration, body)
          .catch(err => logger.error('Failed to set cache in Redis:', err));
        originalSend.call(res, body);
      };
      next();
    }
  } catch (error) {
    logger.error('Error with Redis cache middleware:', error);
    // Continue to next middleware if cache fails, don't block the request
    next();
  }
};

/**
 * Middleware to clear cache keys matching a pattern.
 * Use after POST, PUT, DELETE operations that modify data.
 *
 * @param {string[]} patterns - Array of glob-style patterns (e.g., 'cache:user_id:api/projects*').
 * @returns {Function} Express middleware.
 */
const clearCache = (patterns) => async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      // If no user, cannot clear user-specific cache, proceed
      logger.warn('Clear cache middleware called without req.user for specific cache invalidation.');
      return next();
    }

    // Apply user-specific ID to patterns
    const userSpecificPatterns = patterns.map(pattern => pattern.replace('{userId}', userId));
    
    // Iterate over patterns and delete matching keys
    for (const pattern of userSpecificPatterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug(`Cleared cache keys matching pattern: ${pattern}. Count: ${keys.length}`);
      }
    }
    next();
  } catch (error) {
    logger.error('Error clearing cache in Redis:', error);
    next(new AppError('Failed to clear cache.', 500)); // Consider if this should be a critical error
  }
};

module.exports = {
  cache,
  clearCache,
};
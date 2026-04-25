```javascript
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const cacheMiddleware = (keyPrefix, ttlSeconds = 3600) => { // Default TTL of 1 hour
  return async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`; // Unique key for this request

    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        logger.debug(`Cache HIT for key: ${cacheKey}`);
        return res.status(200).json({
          status: 'success',
          message: 'Data from cache',
          data: JSON.parse(cachedData),
        });
      }
      logger.debug(`Cache MISS for key: ${cacheKey}`);
      // If not in cache, proceed to route handler and then cache the response
      const originalSend = res.json;
      res.json = async (body) => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            await cache.set(cacheKey, JSON.stringify(body), ttlSeconds);
            logger.debug(`Cached data for key: ${cacheKey} with TTL: ${ttlSeconds}s`);
          }
        } catch (cacheError) {
          logger.error(`Error caching data for ${cacheKey}: ${cacheError.message}`, cacheError);
          // Don't block the request if caching fails
        }
        originalSend.call(res, body);
      };
      next();
    } catch (error) {
      logger.error(`Error in cache middleware for ${cacheKey}: ${error.message}`, error);
      // If Redis is down or error occurs, bypass cache and proceed to route
      next();
    }
  };
};

module.exports = cacheMiddleware;
```
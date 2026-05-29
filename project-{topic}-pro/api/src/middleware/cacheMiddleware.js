```javascript
const httpStatus = require('http-status');
const { getCache, setCache } = require('../utils/cache');
const logger = require('../config/logger');
const { CACHE_TTL_SHORT } = require('../config/constants');

/**
 * Middleware to check for cached responses.
 * If a cached response exists, it's sent directly. Otherwise, proceeds to route handler.
 * @param {number} [ttlSeconds] - Time to live for the cache entry in seconds. Defaults to CACHE_TTL_SHORT.
 */
const cacheMiddleware = (ttlSeconds = CACHE_TTL_SHORT) => async (req, res, next) => {
  if (req.method !== 'GET') {
    // Only cache GET requests
    return next();
  }

  const key = req.originalUrl;
  try {
    const cachedResponse = await getCache(key);

    if (cachedResponse) {
      logger.debug(`Cache HIT for key: ${key}`);
      return res.status(httpStatus.OK).send(JSON.parse(cachedResponse));
    }

    // No cache hit, proceed to route handler and then cache the response
    const originalSend = res.send;
    res.send = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(key, body, ttlSeconds).catch((error) => {
          logger.error(`Error setting cache for key ${key}: ${error.message}`);
        });
        logger.debug(`Cache MISS for key: ${key}. Response cached for ${ttlSeconds}s.`);
      }
      originalSend.call(res, body);
    };
    next();
  } catch (error) {
    logger.error(`Error checking cache for key ${key}: ${error.message}`);
    next(); // Continue without caching if Redis is down or errors
  }
};

module.exports = cacheMiddleware;
```
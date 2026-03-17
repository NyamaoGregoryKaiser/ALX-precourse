```javascript
const redisClient = require('../utils/redisClient');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const { redisCacheTTL } = require('../config/redis');

const cacheMiddleware = (keyPrefix, ttlSeconds = redisCacheTTL) => async (req, res, next) => {
  if (!redisClient.isReady) {
    logger.warn('Redis client not ready, skipping cache middleware.');
    return next();
  }

  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const key = `${keyPrefix}:${req.originalUrl}`; // Unique key for each URL

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      logger.info(`Cache hit for key: ${key}`);
      return res.status(200).json(JSON.parse(cachedData));
    }
    
    // If not in cache, proceed to route handler and then cache the response
    const originalSend = res.send;
    res.send = (body) => {
      if (res.statusCode === 200) { // Only cache successful responses
        redisClient.set(key, body, { EX: ttlSeconds })
          .then(() => logger.info(`Cached response for key: ${key}`))
          .catch((err) => logger.error(`Failed to cache response for ${key}: ${err.message}`));
      }
      originalSend.call(res, body);
    };
    next();
  } catch (error) {
    logger.error(`Redis cache error for key ${key}: ${error.message}`);
    // If Redis fails, don't block the request, just proceed without caching
    next();
  }
};

module.exports = cacheMiddleware;
```
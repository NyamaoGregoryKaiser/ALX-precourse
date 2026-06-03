```javascript
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const cacheMiddleware = (keyPrefix, ttlSeconds = 3600) => async (req, res, next) => {
  const cacheKey = `${keyPrefix}:${req.originalUrl}`;

  try {
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    // If no cache, proceed to the route handler and then cache the response
    const originalJson = res.json;
    res.json = (body) => {
      cacheService.set(cacheKey, JSON.stringify(body), ttlSeconds)
        .catch(err => logger.error(`Error caching data for ${cacheKey}:`, err.message));
      originalJson.call(res, body);
    };

    next();
  } catch (error) {
    logger.error(`Error in cache middleware for ${cacheKey}:`, error.message);
    next(); // Continue without caching if there's an error
  }
};

module.exports = cacheMiddleware;
```
const redisClient = require('../utils/redis');
const logger = require('../utils/logger');

const cacheMiddleware = (durationInSeconds) => async (req, res, next) => {
  const key = req.originalUrl || req.url;
  try {
    const cachedResponse = await redisClient.get(key);
    if (cachedResponse) {
      logger.debug(`Cache hit for ${key}`);
      return res.send(JSON.parse(cachedResponse));
    }

    // If not in cache, proxy the request and cache the response
    res.originalSend = res.send;
    res.send = (body) => {
      redisClient.setex(key, durationInSeconds, JSON.stringify(body)).catch(err => {
        logger.error(`Error caching response for ${key}:`, err);
      });
      res.originalSend(body);
    };
    next();
  } catch (err) {
    logger.error('Redis cache middleware error:', err);
    next(); // Continue without caching if Redis fails
  }
};

const clearCache = async (key) => {
  try {
    await redisClient.del(key);
    logger.info(`Cache cleared for key: ${key}`);
  } catch (error) {
    logger.error(`Failed to clear cache for key: ${key}`, error);
  }
};

module.exports = {
  cacheMiddleware,
  clearCache,
};
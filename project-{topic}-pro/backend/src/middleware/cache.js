const { redisClient } = require('../utils/redisClient');
const config = require('../config/config');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getCacheKey = (req) => {
  return `${req.originalUrl || req.url}`; // Use full URL as key
};

const applyCacheMiddleware = () => async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = getCacheKey(req);

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      logger.debug(`Cache hit for key: ${key}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    // If not in cache, proceed and then cache the response
    const originalSend = res.json;
    res.json = async function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) { // Only cache successful responses
        await redisClient.set(key, JSON.stringify(data), {
          EX: config.cache.ttlSeconds, // Set expiry
        });
        logger.debug(`Cached response for key: ${key}`);
      }
      originalSend.apply(res, arguments);
    };
    next();
  } catch (error) {
    logger.error('Redis cache error:', error);
    // If Redis is down or cache fails, continue without caching
    next(new AppError('Redis cache error, please try again.', 500));
  }
};

const clearCache = async (keyPattern) => {
  try {
    const keys = await redisClient.keys(keyPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleared cache keys matching pattern: ${keyPattern}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache for pattern ${keyPattern}:`, error);
    throw new AppError('Failed to clear cache.', 500);
  }
};

module.exports = { applyCacheMiddleware, clearCache, getCacheKey };
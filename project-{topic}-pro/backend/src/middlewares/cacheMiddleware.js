const config = require('../config');
const redisClient = require('../utils/redisClient');
const logger = require('../utils/logger');

const cacheMiddleware = (req, res, next) => {
  if (!config.cache.enabled || req.method !== 'GET') {
    return next();
  }

  const key = req.originalUrl;

  redisClient.get(key, (err, data) => {
    if (err) {
      logger.error('Redis cache error:', err);
      return next();
    }

    if (data !== null) {
      logger.debug(`Cache hit for ${key}`);
      return res.send(JSON.parse(data));
    } else {
      logger.debug(`Cache miss for ${key}`);
      // If no data in cache, we override res.send to cache the response
      const originalSend = res.send;
      res.send = (body) => {
        redisClient.setEx(key, config.cache.ttl, JSON.stringify(body))
          .catch((cacheErr) => logger.error('Failed to set cache:', cacheErr));
        originalSend.call(res, body);
      };
      next();
    }
  });
};

const clearCache = (req, res, next) => {
  if (config.cache.enabled) {
    redisClient.keys('*/api/*')
      .then(keys => {
        if (keys.length > 0) {
          return redisClient.del(keys);
        }
        return 0;
      })
      .then(deletedCount => {
        logger.info(`Cleared ${deletedCount} cache entries.`);
      })
      .catch(err => {
        logger.error('Error clearing cache:', err);
      });
  }
  next();
};

module.exports = { cacheMiddleware, clearCache };
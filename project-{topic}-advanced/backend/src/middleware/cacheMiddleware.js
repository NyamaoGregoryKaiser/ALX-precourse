const { cache } = require('../config/cache');
const { logger } = require('../config/logger');

const cacheMiddleware = (durationInSeconds) => (req, res, next) => {
  if (req.method !== 'GET') {
    logger.debug('Skipping cache for non-GET request.');
    return next();
  }

  const key = req.originalUrl || req.url;
  const cachedBody = cache.get(key);

  if (cachedBody) {
    logger.debug(`Cache HIT for key: ${key}`);
    return res.status(200).json(cachedBody);
  } else {
    logger.debug(`Cache MISS for key: ${key}`);
    res.sendResponse = res.json; // Store original json method
    res.json = (body) => {
      cache.set(key, body, durationInSeconds || undefined); // Use default TTL if not specified
      res.sendResponse(body);
    };
    next();
  }
};

// Middleware to clear specific cache keys
const clearCache = (keysToClear) => (req, res, next) => {
  if (Array.isArray(keysToClear)) {
    keysToClear.forEach(key => {
      if (typeof key === 'function') {
        const generatedKey = key(req); // Allow dynamic key generation
        if (generatedKey) cache.del(generatedKey);
      } else {
        cache.del(key);
      }
    });
  } else if (typeof keysToClear === 'string') {
    cache.del(keysToClear);
  }
  logger.info(`Cache cleared for keys: ${keysToClear}`);
  next();
};

module.exports = {
  cacheMiddleware,
  clearCache
};
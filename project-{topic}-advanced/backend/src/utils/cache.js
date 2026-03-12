const NodeCache = require('node-cache');
const logger = require('./logger');

// Cache configuration: stdTTL (standard TTL in seconds), checkperiod (interval to check expired keys)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 minutes TTL, check every 60 seconds

cache.on('set', (key, value) => {
  logger.debug(`Cache set for key: ${key}`);
});

cache.on('del', (key) => {
  logger.debug(`Cache deleted for key: ${key}`);
});

cache.on('expired', (key, value) => {
  logger.debug(`Cache expired for key: ${key}`);
});

module.exports = {
  get: (key) => {
    const value = cache.get(key);
    if (value) {
      logger.debug(`Cache HIT for key: ${key}`);
    } else {
      logger.debug(`Cache MISS for key: ${key}`);
    }
    return value;
  },
  set: (key, value, ttl = 300) => { // Default TTL of 5 minutes
    cache.set(key, value, ttl);
    logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);
  },
  del: (key) => {
    cache.del(key);
  },
  flushAll: () => {
    cache.flushAll();
    logger.info('Cache flushed.');
  }
};
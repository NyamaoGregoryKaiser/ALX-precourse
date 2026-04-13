const NodeCache = require('node-cache');
const { logger } = require('./logger');

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10), // 5 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
});

cache.on('set', (key, value) => {
  logger.debug(`Cache SET: ${key}`);
});

cache.on('del', (key, value) => {
  logger.debug(`Cache DEL: ${key}`);
});

cache.on('expired', (key, value) => {
  logger.debug(`Cache EXPIRED: ${key}`);
});

module.exports = {
  cache,
};
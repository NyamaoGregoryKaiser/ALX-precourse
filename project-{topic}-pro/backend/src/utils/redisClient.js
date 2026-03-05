const { createClient } = require('redis');
const config = require('../config');
const logger = require('./logger');

const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('connect', () => logger.info('Redis connected successfully!'));
redisClient.on('error', (err) => logger.error('Redis client error', err));

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;
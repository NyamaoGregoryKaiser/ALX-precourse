const redis = require('redis');
const config = require('../config/config');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
});

redisClient.on('connect', () => logger.info('Connected to Redis!'));
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('Could not connect to Redis:', err.message);
    // In a production environment, you might want to gracefully handle this
    // or exit if Redis is a hard dependency. For now, we'll let the app
    // continue without caching.
  }
})();

module.exports = { redisClient };
```javascript
const { createClient } = require('redis');
const config = require('./index');
const logger = require('./logger');

const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('connect', () => logger.info('Redis client connected.'));
redisClient.on('error', (err) => logger.error('Redis client error:', err));

/**
 * Connects to the Redis server.
 * @returns {Promise<void>}
 */
async function connectRedis() {
  if (!redisClient.isReady) {
    await redisClient.connect();
  }
}

/**
 * Disconnects from the Redis server.
 * @returns {Promise<void>}
 */
async function disconnectRedis() {
  if (redisClient.isReady) {
    await redisClient.quit();
    logger.info('Redis client disconnected.');
  }
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
};
```
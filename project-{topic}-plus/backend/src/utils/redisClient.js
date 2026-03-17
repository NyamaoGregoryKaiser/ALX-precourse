```javascript
const { createClient } = require('redis');
const { redisHost, redisPort } = require('../config/redis');
const logger = require('./logger');

const redisClient = createClient({
  url: `redis://${redisHost}:${redisPort}`
});

redisClient.on('connect', () => logger.info('Redis client connected.'));
redisClient.on('ready', () => logger.info('Redis client is ready to use.'));
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('end', () => logger.info('Redis client disconnected.'));

// Connect to Redis only once
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;
```
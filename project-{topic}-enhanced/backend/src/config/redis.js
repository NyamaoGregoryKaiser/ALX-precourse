```javascript
const { createClient } = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('ready', () => logger.info('Redis client ready to use'));
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('end', () => logger.info('Redis client disconnected'));

// Connect to Redis when the module is imported
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Exit process if Redis is critical for application, or handle gracefully
  }
})();


module.exports = redisClient;
```
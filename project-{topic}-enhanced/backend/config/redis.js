```javascript
const redis = require('redis');
const config = require('./config');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
  password: config.redis.password,
});

redisClient.on('connect', () => logger.info('Redis client connected to server'));
redisClient.on('ready', () => logger.info('Redis client ready to use'));
redisClient.on('error', (err) => logger.error('Redis client error:', err));
redisClient.on('end', () => logger.info('Redis client disconnected from server'));

// Ensure the client connects when required
(async () => {
  if (!redisClient.isReady) {
    try {
      await redisClient.connect();
    } catch (err) {
      logger.error('Failed to connect to Redis:', err);
    }
  }
})();

module.exports = redisClient;
```
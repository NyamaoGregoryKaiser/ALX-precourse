```javascript
const redis = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
  legacyMode: true, // For compatibility with some older client methods
});

(async () => {
  redisClient.on('connect', () => logger.info('Redis client connected'));
  redisClient.on('ready', () => logger.info('Redis client ready to use'));
  redisClient.on('error', (err) => logger.error('Redis client error:', err.message));
  redisClient.on('end', () => logger.warn('Redis client disconnected'));

  await redisClient.connect();
})();

module.exports = redisClient;
```
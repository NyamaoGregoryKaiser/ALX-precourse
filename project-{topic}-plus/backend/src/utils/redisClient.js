```javascript
const redis = require('redis');
const { config } = require('../config/config');
const logger = require('./logger');

const redisClient = redis.createClient({
  url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}`,
});

redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('ready', () => logger.info('Redis client ready to use'));
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('end', () => logger.info('Redis client disconnected'));

(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;
```
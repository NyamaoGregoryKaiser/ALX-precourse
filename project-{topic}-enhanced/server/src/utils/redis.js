const { createClient } = require('redis');
const config = require('../config/config');
const logger = require('./logger');

const redisClient = createClient({
  url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}`,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('end', () => logger.info('Redis client disconnected'));

// Do not call connect() here, it should be called once on server startup (e.g., in server.js)
// But we expose it for explicit connection management

module.exports = redisClient;
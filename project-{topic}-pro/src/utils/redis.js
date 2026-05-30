const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null, // Unlimited retries
  enableOfflineQueue: true, // Queue commands while offline
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully.');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

module.exports = redisClient;
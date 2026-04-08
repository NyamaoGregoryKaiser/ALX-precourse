require('dotenv').config();
const Redis = require('ioredis');
const logger = require('./logger');

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined, // Only if Redis requires auth
  maxRetriesPerRequest: null, // Allow unlimited retries for connection stability
  enableOfflineQueue: false, // Disable command queuing when offline
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000); // Exponential back-off, max 2 seconds
    logger.warn(`Redis: Retrying connection... attempt ${times}, delay ${delay}ms`);
    return delay;
  },
};

const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => logger.info('Redis client connected to server'));
redisClient.on('ready', () => logger.info('Redis client is ready'));
redisClient.on('error', (err) => logger.error('Redis client error:', err));
redisClient.on('close', () => logger.warn('Redis client connection closed'));
redisClient.on('reconnecting', (delay) => logger.warn(`Redis client reconnecting (delay: ${delay}ms)`));
redisClient.on('end', () => logger.info('Redis client connection ended'));

module.exports = redisClient;
```
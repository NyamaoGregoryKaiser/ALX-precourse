require('dotenv').config();
const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('connect', () => logger.info('Redis client connected.'));
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

async function connectRedis() {
  if (!redisClient.isReady) {
    await redisClient.connect();
  }
}

connectRedis(); // Connect on startup

module.exports = redisClient;
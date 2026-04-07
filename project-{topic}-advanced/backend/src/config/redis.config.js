const redis = require('redis');
const config = require('./config');
const logger = require('./logger.config');

let redisClient;

const connectRedis = async () => {
  redisClient = redis.createClient({
    url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}`,
  });

  redisClient.on('error', (err) => logger.error('Redis Client Error', err));

  await redisClient.connect();
};

const getRedisClient = () => {
  if (!redisClient || !redisClient.isReady) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
};
import { createClient, RedisClientType } from 'redis';
import { config } from '@/config';
import logger from '@/utils/logger';

let redisClient: RedisClientType;

export const connectRedis = async () => {
  redisClient = createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
  });

  redisClient.on('error', (err) => logger.error('Redis Client Error', err));

  await redisClient.connect();
  logger.info('Redis connected successfully.');
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient || !redisClient.isReady) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient && redisClient.isReady) {
    await redisClient.quit();
    logger.info('Redis disconnected.');
  }
};
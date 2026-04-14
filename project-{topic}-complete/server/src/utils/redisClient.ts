import { createClient } from 'redis';
import config from '../config';
import logger from './logger';

const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

export const connectRedis = async () => {
  if (!redisClient.isReady) {
    await redisClient.connect();
  }
};

export const getRedisClient = () => redisClient;
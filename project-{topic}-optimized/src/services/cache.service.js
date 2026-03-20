const redis = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: `redis://${config.redis.host}:${config.redis.port}`,
      password: config.redis.password
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    redisClient.on('connect', () => logger.info('Redis Client Connected'));
    redisClient.on('end', () => logger.info('Redis Client Disconnected'));

    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Optionally, exit the process or try to reconnect
  }
};

const getCache = async (key) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready. Skipping cache get.');
    return null;
  }
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting data from cache for key ${key}:`, error);
    return null;
  }
};

// ttl in seconds
const setCache = async (key, value, ttl = 3600) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready. Skipping cache set.');
    return;
  }
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error(`Error setting data to cache for key ${key}:`, error);
  }
};

const deleteCache = async (key) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready. Skipping cache delete.');
    return;
  }
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Error deleting data from cache for key ${key}:`, error);
  }
};

const invalidateCacheByPattern = async (pattern) => {
  if (!redisClient || !redisClient.isReady) {
    logger.warn('Redis client not ready. Skipping cache invalidation.');
    return;
  }
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Error invalidating cache by pattern ${pattern}:`, error);
  }
};

module.exports = {
  connectRedis,
  getCache,
  setCache,
  deleteCache,
  invalidateCacheByPattern
};
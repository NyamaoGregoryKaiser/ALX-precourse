import Redis from 'ioredis';
import { REDIS_URL } from '../config';
import logger from './logger';

let redisClient: Redis;

/**
 * Initializes the Redis client.
 * Attempts to connect to Redis and logs connection status.
 */
export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = new Redis(REDIS_URL);

    redisClient.on('connect', () => logger.info('Redis client connected successfully!'));
    redisClient.on('error', (err) => logger.error('Redis connection error:', err));

    // Ping to ensure connection is established
    await redisClient.ping();
    logger.info('Redis connection established.');
  } catch (err) {
    logger.error('Could not connect to Redis:', err);
    // In a production environment, you might want to gracefully degrade or retry
    process.exit(1); // Exit if Redis is critical for startup
  }
};

/**
 * Gets a value from Redis cache.
 * @param key The cache key.
 * @returns The cached value as a string, or null if not found.
 */
export const getFromCache = async (key: string): Promise<string | null> => {
  if (!redisClient) {
    logger.warn('Redis client not initialized. Cannot get from cache.');
    return null;
  }
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error(`Error getting key "${key}" from Redis cache:`, error);
    return null;
  }
};

/**
 * Sets a value in Redis cache with an optional expiration time.
 * @param key The cache key.
 * @param value The value to cache (will be stringified if not a string).
 * @param expiresInSeconds Optional expiration time in seconds.
 */
export const setToCache = async (key: string, value: any, expiresInSeconds?: number): Promise<void> => {
  if (!redisClient) {
    logger.warn('Redis client not initialized. Cannot set to cache.');
    return;
  }
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (expiresInSeconds) {
      await redisClient.setex(key, expiresInSeconds, stringValue);
    } else {
      await redisClient.set(key, stringValue);
    }
    logger.debug(`Set key "${key}" in Redis cache.`);
  } catch (error) {
    logger.error(`Error setting key "${key}" in Redis cache:`, error);
  }
};

/**
 * Deletes a key from Redis cache.
 * @param key The cache key to delete.
 */
export const deleteFromCache = async (key: string | string[]): Promise<void> => {
  if (!redisClient) {
    logger.warn('Redis client not initialized. Cannot delete from cache.');
    return;
  }
  try {
    if (Array.isArray(key)) {
      await redisClient.del(...key);
      logger.debug(`Deleted keys "${key.join(', ')}" from Redis cache.`);
    } else {
      await redisClient.del(key);
      logger.debug(`Deleted key "${key}" from Redis cache.`);
    }
  } catch (error) {
    logger.error(`Error deleting key "${key}" from Redis cache:`, error);
  }
};

/**
 * Clears all keys from Redis cache. Use with caution!
 */
export const clearCache = async (): Promise<void> => {
  if (!redisClient) {
    logger.warn('Redis client not initialized. Cannot clear cache.');
    return;
  }
  try {
    await redisClient.flushall();
    logger.info('Redis cache cleared.');
  } catch (error) {
    logger.error('Error clearing Redis cache:', error);
  }
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};
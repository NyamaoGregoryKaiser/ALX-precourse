const redis = require('redis');
const config = require('../config');
const logger = require('./logger');

let redisClient;

/**
 * Initializes the Redis client connection.
 * @returns {Promise<void>}
 */
const connectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    logger.info('Redis client already connected.');
    return;
  }

  const client = redis.createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
    password: config.redis.password,
  });

  client.on('error', (err) => logger.error('Redis Client Error', err));
  client.on('connect', () => logger.info('Redis client connected.'));
  client.on('ready', () => logger.info('Redis client ready to use.'));
  client.on('end', () => logger.warn('Redis client disconnected.'));

  try {
    await client.connect();
    redisClient = client;
  } catch (err) {
    logger.error('Failed to connect to Redis:', err);
    // Optionally re-throw or handle error to prevent app startup if Redis is critical
  }
};

/**
 * Disconnects the Redis client.
 * @returns {Promise<void>}
 */
const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect();
  }
};

/**
 * Sets a value in Redis cache.
 * @param {string} key - Cache key.
 * @param {any} value - Value to store.
 * @param {number} ttl - Time-to-live in seconds (default to 1 hour).
 * @returns {Promise<void>}
 */
const setCache = async (key, value, ttl = 3600) => {
  if (!redisClient || !redisClient.isOpen) {
    logger.warn('Redis client not connected. Skipping cache set for key:', key);
    return;
  }
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    logger.debug(`Cache set for key: ${key}`);
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
  }
};

/**
 * Gets a value from Redis cache.
 * @param {string} key - Cache key.
 * @returns {Promise<any | null>} Cached value or null if not found/error.
 */
const getCache = async (key) => {
  if (!redisClient || !redisClient.isOpen) {
    logger.warn('Redis client not connected. Skipping cache get for key:', key);
    return null;
  }
  try {
    const data = await redisClient.get(key);
    logger.debug(`Cache get for key: ${key}, result: ${data ? 'hit' : 'miss'}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Deletes a key from Redis cache.
 * @param {string} key - Cache key.
 * @returns {Promise<number>} Number of keys deleted.
 */
const deleteCache = async (key) => {
  if (!redisClient || !redisClient.isOpen) {
    logger.warn('Redis client not connected. Skipping cache delete for key:', key);
    return 0;
  }
  try {
    const deletedCount = await redisClient.del(key);
    logger.debug(`Cache deleted for key: ${key}, count: ${deletedCount}`);
    return deletedCount;
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
    return 0;
  }
};

// Connect Redis on application startup (handled in server.js or elsewhere)
// For now, call it here, but typically it would be a part of app init logic
if (config.env !== 'test') { // Don't connect Redis in test env unless specifically testing Redis
  connectRedis();
}

module.exports = {
  connectRedis,
  disconnectRedis,
  setCache,
  getCache,
  deleteCache,
  get client() { // Expose client for direct access if needed
    return redisClient;
  }
};
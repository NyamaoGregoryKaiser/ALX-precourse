```javascript
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const get = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (err) {
    logger.error(`CacheService: Error getting key ${key}:`, err.message);
    return null;
  }
};

const set = async (key, value, ttlSeconds = 3600) => {
  try {
    // Set with expiration (EX option)
    await redisClient.set(key, value, { EX: ttlSeconds });
  } catch (err) {
    logger.error(`CacheService: Error setting key ${key}:`, err.message);
  }
};

const del = async (key) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.error(`CacheService: Error deleting key ${key}:`, err.message);
  }
};

const invalidatePrefix = async (prefix) => {
  try {
    const keys = await redisClient.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug(`Invalidated ${keys.length} keys with prefix ${prefix}`);
    }
  } catch (err) {
    logger.error(`CacheService: Error invalidating prefix ${prefix}:`, err.message);
  }
};

module.exports = {
  get,
  set,
  del,
  invalidatePrefix,
};
```
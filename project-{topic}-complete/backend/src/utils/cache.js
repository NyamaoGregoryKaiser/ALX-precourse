```javascript
const NodeCache = require('node-cache');
const config = require('../config/config');
const logger = require('./logger');

// Initialize NodeCache with a default TTL
const cache = new NodeCache({ stdTTL: config.cache.ttlSeconds });

/**
 * Sets a value in the cache.
 * @param {string} key - The cache key.
 * @param {any} value - The value to store.
 * @param {number} [ttl] - Optional TTL in seconds for this specific item. Defaults to global stdTTL.
 */
const setCache = (key, value, ttl) => {
    const success = cache.set(key, value, ttl);
    if (success) {
        logger.debug(`Cache set: ${key}`);
    } else {
        logger.warn(`Failed to set cache for key: ${key}`);
    }
    return success;
};

/**
 * Gets a value from the cache.
 * @param {string} key - The cache key.
 * @returns {any | undefined} The cached value or undefined if not found.
 */
const getCache = (key) => {
    const value = cache.get(key);
    if (value) {
        logger.debug(`Cache hit: ${key}`);
    } else {
        logger.debug(`Cache miss: ${key}`);
    }
    return value;
};

/**
 * Deletes a value or multiple values from the cache.
 * @param {string | string[]} keys - The key or an array of keys to delete.
 * @returns {number} The number of keys deleted.
 */
const deleteCache = (keys) => {
    const count = cache.del(keys);
    logger.debug(`Cache deleted for key(s): ${keys}. Count: ${count}`);
    return count;
};

/**
 * Clears the entire cache.
 */
const clearAllCache = () => {
    cache.flushAll();
    logger.info('All cache cleared.');
};

// Listen for cache events (optional, for monitoring)
cache.on('del', (key, value) => {
    logger.debug(`Cache entry deleted: ${key}`);
});

cache.on('expired', (key, value) => {
    logger.debug(`Cache entry expired: ${key}`);
});

module.exports = {
    setCache,
    getCache,
    deleteCache,
    clearAllCache
};
```
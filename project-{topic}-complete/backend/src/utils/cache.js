const logger = require('../middleware/logger');

const cache = new Map();
const TTL = parseInt(process.env.CACHE_TTL || 3600) * 1000; // Default 1 hour in milliseconds

/**
 * Sets a value in the cache.
 * @param {string} key - The cache key.
 * @param {*} value - The value to store.
 * @param {number} [ttl=TTL] - Time to live in milliseconds for this specific item.
 */
const setCache = (key, value, ttl = TTL) => {
    const expiresAt = Date.now() + ttl;
    cache.set(key, { value, expiresAt });
    logger.debug(`Cache set for key: ${key}, expires in ${ttl / 1000}s`);
};

/**
 * Gets a value from the cache. If expired, it's removed and returns undefined.
 * @param {string} key - The cache key.
 * @returns {*} The cached value or undefined.
 */
const getCache = (key) => {
    const item = cache.get(key);
    if (!item) {
        return undefined;
    }

    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        logger.debug(`Cache expired and deleted for key: ${key}`);
        return undefined;
    }

    logger.debug(`Cache hit for key: ${key}`);
    return item.value;
};

/**
 * Deletes an item from the cache.
 * @param {string} key - The cache key.
 */
const deleteCache = (key) => {
    const deleted = cache.delete(key);
    if (deleted) {
        logger.debug(`Cache deleted for key: ${key}`);
    }
};

/**
 * Clears the entire cache.
 */
const clearCache = () => {
    cache.clear();
    logger.info('Cache cleared.');
};

// Periodically clean up expired items (optional, as getCache also cleans on access)
setInterval(() => {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
        if (now > item.expiresAt) {
            cache.delete(key);
            logger.debug(`Background cache cleanup: deleted expired key ${key}`);
        }
    }
}, 300000); // Run every 5 minutes

module.exports = {
    setCache,
    getCache,
    deleteCache,
    clearCache
};
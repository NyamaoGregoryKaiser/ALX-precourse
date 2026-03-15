const NodeCache = require('node-cache');
const logger = require('../middleware/logger');

// Initialize NodeCache with a default TTL (time to live)
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 300 }); // Default 5 minutes

cache.on('set', (key, value) => {
    logger.debug(`Cache SET: ${key}`);
});

cache.on('del', (key) => {
    logger.debug(`Cache DEL: ${key}`);
});

cache.on('expired', (key, value) => {
    logger.debug(`Cache EXPIRED: ${key}`);
});

class CacheService {
    get(key) {
        logger.debug(`Cache GET: ${key}`);
        return cache.get(key);
    }

    set(key, value, ttl = process.env.CACHE_TTL) {
        if (!key || !value) {
            logger.warn('Attempted to set cache with invalid key or value.');
            return false;
        }
        return cache.set(key, value, ttl);
    }

    del(key) {
        logger.debug(`Cache DELETE: ${key}`);
        return cache.del(key);
    }

    flushAll() {
        logger.warn('Flushing entire cache!');
        return cache.flushAll();
    }

    getStats() {
        return cache.getStats();
    }
}

module.exports = new CacheService();
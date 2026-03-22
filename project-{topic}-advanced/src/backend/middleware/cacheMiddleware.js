```javascript
const NodeCache = require('node-cache');
const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');

const defaultTTL = parseInt(process.env.CACHE_TTL_SECONDS || 300); // Default 5 minutes

// Initialize caches
const productCache = new NodeCache({ stdTTL: defaultTTL, checkperiod: defaultTTL * 0.2, useClones: false });

productCache.on('del', (key, value) => {
    logger.debug(`Cache deleted for key: ${key}`);
});
productCache.on('expired', (key, value) => {
    logger.debug(`Cache expired for key: ${key}`);
});

/**
 * Caching middleware for product listings.
 * Caches responses for `GET /products` and `GET /products/:id`.
 */
exports.cacheProducts = (req, res, next) => {
    // Determine cache key based on request URL or params
    const cacheKey = req.originalUrl || req.url;

    const cachedResponse = productCache.get(cacheKey);
    if (cachedResponse) {
        logger.debug(`Serving from cache for key: ${cacheKey}`);
        return res.status(StatusCodes.OK).json(cachedResponse);
    }

    // If not in cache, proceed to route handler and cache the response
    res.sendResponse = res.json;
    res.json = (body) => {
        logger.debug(`Caching response for key: ${cacheKey}`);
        productCache.set(cacheKey, body);
        res.sendResponse(body);
    };
    next();
};

exports.productCache = productCache; // Export the cache instance for clearing
```
```javascript
const redis = require('redis');
const config = require('../config');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const httpStatus = require('http-status');

const redisClient = redis.createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
});

redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('error', (err) => logger.error('Redis client error:', err));

// Connect to Redis when the module is imported
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        logger.error('Failed to connect to Redis:', err);
    }
})();

const cacheMiddleware = (durationInSeconds) => {
    return async (req, res, next) => {
        if (!redisClient.isReady) {
            logger.warn('Redis not ready, skipping cache for:', req.originalUrl);
            return next();
        }

        const key = req.originalUrl;
        try {
            const cachedResponse = await redisClient.get(key);
            if (cachedResponse) {
                logger.debug(`Cache hit for ${key}`);
                return res.send(JSON.parse(cachedResponse));
            } else {
                logger.debug(`Cache miss for ${key}`);
                const originalSend = res.send;
                res.send = (body) => {
                    redisClient.setEx(key, durationInSeconds, JSON.stringify(body)).catch((err) => {
                        logger.error('Error setting cache:', err);
                    });
                    originalSend.call(res, body);
                };
                next();
            }
        } catch (err) {
            logger.error('Error in cache middleware:', err);
            next(new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Caching error'));
        }
    };
};

module.exports = {
    redisClient,
    cacheMiddleware,
};
```
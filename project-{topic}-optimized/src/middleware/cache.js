import { createClient } from 'redis';
import config from '../../config/config.js';
import logger from '../utils/logger.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// Initialize Redis client
const redisClient = createClient({
  url: config.redis.url,
  legacyMode: true, // Use legacy mode for compatibility with older libraries if needed
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Connected to Redis!'));

// Connect to Redis when the application starts
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis', err);
  }
})();

/**
 * Caching middleware for GET requests.
 * @param {string} keyPrefix - Prefix for the cache key (e.g., 'users', 'projects').
 * @param {number} ttl - Time-to-live for the cache in seconds.
 * @returns {Function} Express middleware.
 */
const cacheMiddleware = (keyPrefix, ttl = 3600) => catchAsync(async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  // Generate a unique cache key based on URL and user ID (if authenticated)
  const userId = req.user ? req.user.id : 'guest';
  const cacheKey = `${keyPrefix}:${userId}:${req.originalUrl}`;

  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    logger.debug(`Cache hit for ${cacheKey}`);
    return res.status(200).json(JSON.parse(cachedData));
  } else {
    logger.debug(`Cache miss for ${cacheKey}`);
    // Override res.json to cache the response before sending
    const originalJson = res.json;
    res.json = async (body) => {
      await redisClient.setEx(cacheKey, ttl, JSON.stringify(body));
      originalJson.call(res, body);
    };
    next();
  }
});

/**
 * Clears cache for a specific key prefix.
 * Useful after CUD operations to ensure fresh data.
 * @param {string[]} keyPrefixes - Array of key prefixes to invalidate (e.g., ['users', 'projects']).
 * @returns {Function} Express middleware.
 */
const invalidateCache = (keyPrefixes) => catchAsync(async (req, res, next) => {
  if (req.method === 'GET') {
    return next(); // Only invalidate for non-GET requests
  }

  const keysToDelete = [];
  const userId = req.user ? req.user.id : '*'; // Invalidate for all users if not user-specific

  for (const prefix of keyPrefixes) {
    // This is a simplified approach. In a large system, you might use a more granular key pattern
    // or publish/subscribe for cache invalidation across multiple instances.
    const pattern = `${prefix}:${userId}:*`;
    const keys = await redisClient.keys(pattern);
    keysToDelete.push(...keys);
  }

  if (keysToDelete.length > 0) {
    await redisClient.del(keysToDelete);
    logger.info(`Invalidated cache keys: ${keysToDelete.join(', ')}`);
  }

  next();
});

export { redisClient, cacheMiddleware, invalidateCache };
```

```javascript
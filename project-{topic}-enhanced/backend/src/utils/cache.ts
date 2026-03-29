```typescript
import NodeCache from 'node-cache';
import { config } from '../config';
import logger from './logger';

/**
 * Caching utility using node-cache.
 * Provides in-memory caching for frequently accessed data
 * to reduce database load and improve response times.
 */
const cache = new NodeCache({
  stdTTL: config.cacheTtl, // Standard time-to-live for cache entries in seconds
  checkperiod: 120, // Period in seconds to check for expired keys
});

cache.on('del', (key, value) => {
  logger.debug(`Cache: Key "${key}" deleted.`);
});

cache.on('expired', (key, value) => {
  logger.debug(`Cache: Key "${key}" expired.`);
});

/**
 * Sets a value in the cache.
 * @param key The key to store the value under.
 * @param value The value to store.
 * @param ttl Optional. Time-to-live for this specific entry in seconds. If not provided, uses default.
 * @returns true if successful, false otherwise.
 */
export function setCache(key: string, value: any, ttl?: number): boolean {
  logger.debug(`Cache: Setting key "${key}" with TTL ${ttl || cache.options.stdTTL}`);
  return cache.set(key, value, ttl);
}

/**
 * Gets a value from the cache.
 * @param key The key of the value to retrieve.
 * @returns The cached value or undefined if not found.
 */
export function getCache<T>(key: string): T | undefined {
  const value = cache.get<T>(key);
  if (value) {
    logger.debug(`Cache: Hit for key "${key}"`);
  } else {
    logger.debug(`Cache: Miss for key "${key}"`);
  }
  return value;
}

/**
 * Deletes a value or values from the cache.
 * @param keys Single key or array of keys to delete.
 * @returns The number of deleted keys.
 */
export function deleteCache(keys: string | string[]): number {
  const deletedCount = cache.del(keys);
  logger.debug(`Cache: Deleted ${deletedCount} key(s): ${Array.isArray(keys) ? keys.join(', ') : keys}`);
  return deletedCount;
}

/**
 * Flushes (clears) the entire cache.
 */
export function flushCache(): void {
  cache.flushAll();
  logger.info('Cache: All entries flushed.');
}

/**
 * Middleware to invalidate product cache when products are created, updated, or deleted.
 * This ensures that 'getAllProducts' fetches fresh data after modifications.
 * @param req Express request object
 * @param res Express response object
 * @param next Next middleware function
 */
export const invalidateProductCacheMiddleware = (req: any, res: any, next: any) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    deleteCache('allProducts'); // Invalidate the 'allProducts' cache key
    logger.info('Product cache invalidated due to CUD operation.');
  }
  next();
};

export default cache;
```
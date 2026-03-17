```typescript
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

/**
 * @file Caching service wrapper.
 *
 * Provides a simplified interface for interacting with `node-cache`,
 * abstracting cache operations and adding logging.
 */
export class CacheService {
  constructor(private cache: NodeCache) {}

  /**
   * Stores data in the cache.
   * @param {string} key - The cache key.
   * @param {T} value - The data to store.
   * @param {number} [ttlSeconds] - Time-to-live in seconds for this specific key. Overrides default.
   * @returns {boolean} True if the item was set, false otherwise.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): boolean {
    logger.debug(`Caching item with key: ${key}`);
    return this.cache.set(key, value, ttlSeconds);
  }

  /**
   * Retrieves data from the cache.
   * @param {string} key - The cache key.
   * @returns {T | undefined} The cached data, or undefined if not found.
   */
  get<T>(key: string): T | undefined {
    logger.debug(`Attempting to retrieve item from cache with key: ${key}`);
    const value = this.cache.get<T>(key);
    if (value) {
      logger.debug(`Cache hit for key: ${key}`);
    } else {
      logger.debug(`Cache miss for key: ${key}`);
    }
    return value;
  }

  /**
   * Deletes a key from the cache.
   * @param {string} key - The cache key to delete.
   * @returns {number} The number of deleted keys (0 or 1).
   */
  del(key: string): number {
    logger.debug(`Deleting item from cache with key: ${key}`);
    return this.cache.del(key);
  }

  /**
   * Checks if a key exists in the cache.
   * @param {string} key - The cache key.
   * @returns {boolean} True if the key exists, false otherwise.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Flushes the entire cache.
   */
  flushAll(): void {
    logger.warn('Flushing entire cache.');
    this.cache.flushAll();
  }

  /**
   * Returns the number of cached keys.
   * @returns {number} The count of cached keys.
   */
  getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
}
```
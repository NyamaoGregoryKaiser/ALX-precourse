```typescript
import NodeCache from 'node-cache';
import { environment } from './environment';
import { logger } from '../utils/logger';

/**
 * @file Configures and initializes the application's in-memory caching mechanism.
 *
 * This module uses `node-cache` to provide a simple in-memory caching solution
 * for frequently accessed data, improving performance and reducing database load.
 */

interface CacheConfig {
  stdTTL: number; // default time to live in seconds
  checkperiod: number; // interval in seconds to check for expired keys
}

const cacheConfig: CacheConfig = {
  stdTTL: environment.cacheTtlSeconds, // Default to 1 hour (from .env)
  checkperiod: environment.cacheTtlSeconds / 2, // Check for expired keys at half the TTL
};

export const appCache = new NodeCache(cacheConfig);

// Listen for cache events (optional, but good for monitoring)
appCache.on('set', (key, value) => {
  logger.debug(`Cache: Key '${key}' set.`);
});

appCache.on('del', (key) => {
  logger.debug(`Cache: Key '${key}' deleted.`);
});

appCache.on('expired', (key, value) => {
  logger.debug(`Cache: Key '${key}' expired.`);
});

logger.info(`Cache initialized with default TTL: ${cacheConfig.stdTTL} seconds.`);
```
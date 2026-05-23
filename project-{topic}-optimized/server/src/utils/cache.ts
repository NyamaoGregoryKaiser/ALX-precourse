import NodeCache from 'node-cache';
import config from '../config';
import logger from './logger';

const cache = new NodeCache({
  stdTTL: config.cache.ttl, // Standard Time-To-Live in seconds
  checkperiod: 120, // Period in seconds to check for expired keys
});

cache.on('del', (key, value) => {
  logger.debug(`Cache: Key "${key}" deleted`);
});

cache.on('expired', (key, value) => {
  logger.debug(`Cache: Key "${key}" expired`);
});

export const setCache = (key: string, value: any, ttl?: number) => {
  cache.set(key, value, ttl);
  logger.debug(`Cache: Key "${key}" set with TTL: ${ttl || config.cache.ttl}s`);
};

export const getCache = <T>(key: string): T | undefined => {
  const value = cache.get<T>(key);
  if (value) {
    logger.debug(`Cache: Key "${key}" hit`);
  } else {
    logger.debug(`Cache: Key "${key}" miss`);
  }
  return value;
};

export const deleteCache = (key: string) => {
  cache.del(key);
  logger.debug(`Cache: Key "${key}" deleted explicitly`);
};

export default cache;
```
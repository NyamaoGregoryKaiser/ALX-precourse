// This is a simplified in-memory cache for demonstration.
// In a production environment, you would integrate with Redis.

// import Redis from 'ioredis';
// import { config } from '../config/env.config';
// const redisClient = new Redis(config.redisUrl);

// redisClient.on('connect', () => console.log('Redis connected!'));
// redisClient.on('error', (err) => console.error('Redis Client Error', err));

interface CacheEntry<T> {
  value: T;
  expiry: number; // Unix timestamp in milliseconds
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiry < Date.now()) {
      this.cache.delete(key); // Remove expired item
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export const cache = new InMemoryCache(); // Use this for demo
// export const cache = redisClient; // In a real app, use the Redis client directly or wrap it.

// Example Usage (in a service or controller)
/*
  async getProducts() {
    const cachedProducts = await cache.get<Product[]>('all_products');
    if (cachedProducts) {
      logger.info('Returning products from cache');
      return cachedProducts;
    }

    const products = await this.productRepository.findAll();
    await cache.set('all_products', products, 60 * 5); // Cache for 5 minutes
    return products;
  }
*/
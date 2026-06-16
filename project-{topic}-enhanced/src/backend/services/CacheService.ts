import { createClient } from 'redis';
import config from '../config';
import { logger } from '../utils/logger';

// Initialize Redis Client
export const redisClient = createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
    database: process.env.NODE_ENV === 'test' ? 1 : 0, // Use different DB for tests
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));
redisClient.on('reconnecting', () => logger.warn('Redis Client Reconnecting...'));
redisClient.on('end', () => logger.info('Redis Client Disconnected'));

export class CacheService {
    private client = redisClient;
    private defaultTtl = 60 * 5; // Default cache time: 5 minutes

    constructor() {
        if (!this.client.isOpen) {
            this.client.connect().catch((err) => {
                logger.error('Failed to connect Redis client in CacheService constructor', err);
            });
        }
    }

    /**
     * Set a value in the cache.
     * @param key The cache key.
     * @param value The value to store (will be stringified).
     * @param ttl Time-to-live in seconds. Defaults to 5 minutes.
     */
    async set(key: string, value: any, ttl: number = this.defaultTtl): Promise<void> {
        try {
            await this.client.set(key, JSON.stringify(value), { EX: ttl });
            logger.debug(`Cache SET: ${key}`);
        } catch (error) {
            logger.error(`Error setting cache for key ${key}:`, error);
        }
    }

    /**
     * Get a value from the cache.
     * @param key The cache key.
     * @returns The parsed value or null if not found.
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (data) {
                logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(data) as T;
            }
            logger.debug(`Cache MISS: ${key}`);
            return null;
        } catch (error) {
            logger.error(`Error getting cache for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Delete a value from the cache.
     * @param key The cache key.
     */
    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
            logger.debug(`Cache DEL: ${key}`);
        } catch (error) {
            logger.error(`Error deleting cache for key ${key}:`, error);
        }
    }

    /**
     * Invalidate all cache entries (use with caution).
     */
    async flushAll(): Promise<void> {
        try {
            await this.client.flushAll();
            logger.warn('Cache FLUSHED all entries.');
        } catch (error) {
            logger.error('Error flushing all cache entries:', error);
        }
    }

    /**
     * Generate a cache key for user-specific resources.
     * @param userId The ID of the user.
     * @param resource The resource name (e.g., 'projects', 'tasks').
     * @param resourceId Optional ID for a specific resource (e.g., 'project:id').
     * @returns A unique cache key string.
     */
    static generateUserCacheKey(userId: string, resource: string, resourceId?: string): string {
        return resourceId ? `user:${userId}:${resource}:${resourceId}` : `user:${userId}:${resource}`;
    }
}
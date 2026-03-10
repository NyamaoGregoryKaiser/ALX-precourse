import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { Logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: config.redisUrl,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      Logger.info('Connected to Redis...');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      Logger.error('Redis Client Error', err);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      Logger.warn('Redis connection closed.');
    });

    this.connect();
  }

  private async connect() {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        Logger.info('Redis connection established.');
      } catch (err) {
        Logger.error('Failed to connect to Redis', err);
        // Optional: Implement retry logic
      }
    }
  }

  async set(key: string, value: string, expiryInSeconds?: number): Promise<void> {
    if (!this.isConnected) await this.connect(); // Ensure connection before operation
    if (expiryInSeconds) {
      await this.client.set(key, value, { EX: expiryInSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) await this.connect();
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    if (!this.isConnected) await this.connect();
    return this.client.del(key);
  }

  // --- User Online Status Management ---
  // Store a set of socket IDs for each online user
  // This allows a user to be connected from multiple devices/tabs
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    if (!this.isConnected) await this.connect();
    const key = `user:${userId}:sockets`;
    await this.client.sAdd(key, socketId); // Add socketId to the set of user's active sockets
    Logger.info(`User ${userId} - socket ${socketId} added to online set.`);
  }

  async removeUserOnline(userId: string, socketId: string): Promise<void> {
    if (!this.isConnected) await this.connect();
    const key = `user:${userId}:sockets`;
    await this.client.sRem(key, socketId); // Remove socketId from the set
    Logger.info(`User ${userId} - socket ${socketId} removed from online set.`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    const key = `user:${userId}:sockets`;
    const count = await this.client.sCard(key); // Get the number of active sockets
    return count > 0;
  }

  // --- Caching Example (e.g., for user profiles or recent messages) ---
  async cacheData<T>(key: string, data: T, expiryInSeconds: number = 3600): Promise<void> {
    if (!this.isConnected) await this.connect();
    await this.client.set(key, JSON.stringify(data), { EX: expiryInSeconds });
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.isConnected) await this.connect();
    const data = await this.client.get(key);
    return data ? JSON.parse(data) as T : null;
  }
}

export const RedisServiceInstance = new RedisService();
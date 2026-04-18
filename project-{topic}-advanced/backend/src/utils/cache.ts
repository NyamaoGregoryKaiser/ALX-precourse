```typescript
import { Redis } from 'ioredis';
import config from '../config/config';
import logger from './logger';
import { AppError } from './appError';

class CacheService {
  private client: Redis;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  constructor() {
    this.client = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword, // Only if Redis requires authentication
      connectTimeout: 10000, // 10 seconds timeout for connection
      maxRetriesPerRequest: null, // Unlimited retries for requests after initial connection
      enableOfflineQueue: true, // Queue commands when offline, execute when reconnected
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0; // Reset attempts on successful connection
      logger.info('Redis client connected successfully.');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.connectionAttempts++;
      logger.error(`Redis client error (attempt ${this.connectionAttempts}):`, err.message, err.stack);
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        logger.error(`Max Redis connection attempts (${this.maxConnectionAttempts}) reached. Disabling Redis operations.`);
        // Consider gracefully degrading or shutting down if Redis is critical
        this.client.disconnect(); // Prevent further retries if it's a persistent issue
      }
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client disconnected.');
    });
  }

  /**
   * Checks if the Redis client is currently connected.
   * @returns boolean
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Sets a key-value pair in Redis with an optional expiration time.
   * Value is automatically JSON stringified.
   * @param key The key to store.
   * @param value The value to store.
   * @param expiresInSeconds Optional expiration time in seconds (default: 1 hour).
   */
  public async set<T>(key: string, value: T, expiresInSeconds: number = 3600): Promise<void> {
    if (!this.isConnected) {
      logger.warn(`Redis not connected for key ${key}. Skipping set operation.`);
      return;
    }
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', expiresInSeconds);
      logger.debug(`Cache SET: ${key} (expires in ${expiresInSeconds}s)`);
    } catch (error: any) {
      logger.error(`Error setting cache key ${key}:`, error.message, error.stack);
      // It might be acceptable to let cache operations fail without crashing the app
      // throw new AppError(`Failed to set cache key ${key}`, 500, error);
    }
  }

  /**
   * Retrieves a value from Redis by key.
   * Value is automatically JSON parsed.
   * @param key The key to retrieve.
   * @returns The parsed value, or null if key not found or error occurred.
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn(`Redis not connected for key ${key}. Skipping get operation.`);
      return null;
    }
    try {
      const data = await this.client.get(key);
      logger.debug(`Cache GET: ${key} - ${data ? 'HIT' : 'MISS'}`);
      return data ? JSON.parse(data) as T : null;
    } catch (error: any) {
      logger.error(`Error getting cache key ${key}:`, error.message, error.stack);
      return null;
      // throw new AppError(`Failed to get cache key ${key}`, 500, error);
    }
  }

  /**
   * Deletes one or more keys from Redis.
   * @param key A single key or an array of keys to delete.
   * @returns The number of keys that were removed.
   */
  public async del(key: string | string[]): Promise<number> {
    if (!this.isConnected) {
      logger.warn(`Redis not connected for key(s) ${key}. Skipping del operation.`);
      return 0;
    }
    try {
      const deletedCount = await this.client.del(key);
      logger.debug(`Cache DEL: ${key} - Count: ${deletedCount}`);
      return deletedCount;
    } catch (error: any) {
      logger.error(`Error deleting cache key(s) ${key}:`, error.message, error.stack);
      return 0;
      // throw new AppError(`Failed to delete cache key(s) ${key}`, 500, error);
    }
  }

  /**
   * Flushes all keys from the currently selected database.
   * USE WITH EXTREME CAUTION IN PRODUCTION!
   */
  public async flushAll(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected. Skipping flushAll operation.');
      return;
    }
    if (config.nodeEnv === 'production') {
        logger.error('Attempted to flushAll in production environment. This operation is blocked by design.');
        throw new AppError('FlushAll is not allowed in production.', 403);
    }
    try {
      await this.client.flushall();
      logger.info('Redis cache flushed.');
    } catch (error: any) {
      logger.error('Error flushing Redis cache:', error.message, error.stack);
      throw new AppError('Failed to flush Redis cache', 500, error);
    }
  }

  /**
   * Closes the Redis connection gracefully.
   */
  public async close(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      logger.info('Redis client connection closed.');
    }
  }
}

export const cache = new CacheService();

// Example of how to use cache in a service (conceptual)
/*
import { cache } from '../utils/cache';
import { Task } from '../models/Task.entity';
import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';

class TaskService {
  private taskRepository: Repository<Task>;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
  }

  async getAllTasks(projectId?: string): Promise<Task[]> {
    const cacheKey = projectId ? `tasks:project:${projectId}` : 'tasks:all';
    const cachedTasks = await cache.get<Task[]>(cacheKey);
    if (cachedTasks) {
      return cachedTasks;
    }

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const tasks = await this.taskRepository.find({
      where,
      relations: ['project', 'assignee'], // Eager load relations
      order: { createdAt: 'DESC' }
    });

    await cache.set(cacheKey, tasks, 300); // Cache for 5 minutes
    return tasks;
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const newTask = this.taskRepository.create(data);
    const savedTask = await this.taskRepository.save(newTask);

    // Invalidate relevant caches
    await cache.del('tasks:all');
    if (savedTask.projectId) {
      await cache.del(`tasks:project:${savedTask.projectId}`);
    }
    return savedTask;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      return null;
    }

    Object.assign(task, data);
    const updatedTask = await this.taskRepository.save(task);

    // Invalidate caches
    await cache.del('tasks:all');
    if (updatedTask.projectId) {
      await cache.del(`tasks:project:${updatedTask.projectId}`);
    }
    await cache.del(`task:${id}`); // Invalidate specific task detail cache if any
    return updatedTask;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const cacheKey = `task:${id}`;
    const cachedTask = await cache.get<Task>(cacheKey);
    if (cachedTask) {
      return cachedTask;
    }

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'assignee', 'comments']
    });

    if (task) {
      await cache.set(cacheKey, task, 600); // Cache individual task for 10 minutes
    }
    return task;
  }
}
*/
```
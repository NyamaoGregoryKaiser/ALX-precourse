```typescript
// __tests__/setup.ts
import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';
import { User } from '../src/database/entities/User';
import { Task } from '../src/database/entities/Task';
import redisClient from '../src/config/redisClient';
import { logger } from '../src/utils/logger';

// Ensure test environment variables are loaded
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = process.env.DB_DATABASE_TEST || 'task_manager_test_db';
process.env.REDIS_HOST = process.env.REDIS_HOST_TEST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT_TEST ? parseInt(process.env.REDIS_PORT_TEST) : 6379;

beforeAll(async () => {
    logger.silent = true; // Suppress logs during tests for cleaner output
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        await AppDataSource.dropDatabase();
        await AppDataSource.runMigrations(); // Re-create tables from migrations
        // Connect Redis for caching tests
        if (!redisClient.status.includes('connect')) {
            await redisClient.connect();
        }
        await redisClient.flushdb(); // Clear redis before tests
    } catch (error) {
        console.error('Error during test setup:', error);
        process.exit(1);
    }
});

beforeEach(async () => {
    // Clear data between each test
    const userRepository = AppDataSource.getRepository(User);
    const taskRepository = AppDataSource.getRepository(Task);
    await taskRepository.delete({});
    await userRepository.delete({});
    await redisClient.flushdb(); // Clear redis cache
});
```
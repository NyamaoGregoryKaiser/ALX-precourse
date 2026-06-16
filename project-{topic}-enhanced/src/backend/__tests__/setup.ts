import { AppDataSource } from '../database/data-source';
import { logger } from '../utils/logger';
import { redisClient } from '../services/CacheService';
import config from '../config';

// Ensure test environment variables are loaded
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = process.env.DB_DATABASE_TEST || 'task_db_test';
process.env.REDIS_HOST = process.env.REDIS_HOST_TEST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT_TEST || '6379';

// Before all tests, connect to the database and clear it
beforeAll(async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        logger.info('Test database connected.');
        await AppDataSource.runMigrations(); // Run migrations for the test DB
        
        // Clear all tables before running tests to ensure a clean state
        await AppDataSource.manager.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
        await AppDataSource.runMigrations(); // Re-run migrations to set up schema

        // Connect Redis
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
        await redisClient.flushdb(); // Clear Redis cache
        logger.info('Redis for tests connected and flushed.');

    } catch (error) {
        logger.error('Error during test setup:', error);
        process.exit(1);
    }
});

// After each test, clear data
afterEach(async () => {
    try {
        // Clear data from tables, but keep schema for speed
        const entities = AppDataSource.entityMetadatas;
        for (const entity of entities) {
            const repository = AppDataSource.getRepository(entity.name);
            await repository.clear(); // Clears all data from table
        }
        await redisClient.flushdb(); // Clear Redis cache after each test
    } catch (error) {
        logger.error('Error during afterEach cleanup:', error);
    }
});

// After all tests, close the database connection
afterAll(async () => {
    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        logger.info('Test database connection closed.');

        if (redisClient.isOpen) {
            await redisClient.disconnect();
        }
        logger.info('Redis client disconnected.');
    } catch (error) {
        logger.error('Error during test teardown:', error);
    }
});
```

**Unit Test Example: `src/backend/__tests__/unit/UserService.test.ts`**
```typescript
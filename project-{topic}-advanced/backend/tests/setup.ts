```typescript
import 'reflect-metadata';
import { AppDataSource, initializeDataSource } from '../src/data-source';
import { getRedisClient, connectRedis } from '../src/config/redis';
import logger from '../src/utils/logger';
import { RedisClientType } from 'redis'; // Import RedisClientType for typing

// Mock logger in tests to prevent excessive console output and file writes
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let redisTestClient: RedisClientType;

beforeAll(async () => {
  // Ensure NODE_ENV is set to 'test'
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5433/perf_monitor_test_db';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  // Connect to the test database
  await initializeDataSource();
  await AppDataSource.runMigrations(); // Ensure migrations run for tests

  // Connect to the test Redis
  await connectRedis();
  redisTestClient = getRedisClient();

  logger.info('Test environment setup complete.');
}, 60000); // Increased timeout for database and redis setup

beforeEach(async () => {
  // Clear all data from test database before each test
  // This ensures tests are isolated and don't affect each other
  const entities = AppDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
  }

  // Flush Redis before each test
  await redisTestClient.flushDb();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  if (redisTestClient && redisTestClient.isReady) {
    await redisTestClient.quit();
  }
  logger.info('Test environment teardown complete.');
});
```
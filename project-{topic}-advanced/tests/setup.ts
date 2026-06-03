```typescript
import { execSync } from 'child_process';
import { prisma } from '../src/database/prisma-client';
import { env } from '../src/config/env';
import { redisClient } from '../src/utils/redis-client';
import { logger } from '../src/utils/logger';

// This file sets up the test environment before running tests.

beforeAll(async () => {
  logger.info('Setting up test environment...');

  // Set the test database URL
  process.env.DATABASE_URL = env.DATABASE_URL_TEST;
  process.env.REDIS_URL = 'redis://localhost:6380'; // Point to test_redis in docker-compose.test.yml or local

  // Apply migrations to the test database
  try {
    // Ensure Prisma Client is connected to the test database
    await prisma.$connect();
    // Use execSync to run Prisma CLI commands
    // This ensures a clean slate for each test run by re-applying migrations
    execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit', env: process.env });
    logger.info('Test database reset and migrations applied successfully.');

    // Seed the test database
    execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', env: process.env });
    logger.info('Test database seeded successfully.');

  } catch (error) {
    logger.error('Failed to set up test database:', error);
    process.exit(1);
  }

  // Connect to Redis for tests
  try {
    await redisClient.connect();
    // Clear Redis cache before tests
    await redisClient.flushdb();
    logger.info('Connected to Redis and flushed DB for tests.');
  } catch (error) {
    logger.error('Failed to connect to Redis for tests:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  logger.info('Tearing down test environment...');
  await prisma.$disconnect();
  await redisClient.quit();
  logger.info('Disconnected from Prisma and Redis.');
});

// Clean up database after each test run for isolated tests
afterEach(async () => {
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['admin@example.com', 'user@example.com'] // Keep seed users if you want to test against them
      }
    }
  });
  await redisClient.flushdb(); // Clear cache after each test
});
```

**Unit Tests (Example: Password Hasher, Auth Service)**
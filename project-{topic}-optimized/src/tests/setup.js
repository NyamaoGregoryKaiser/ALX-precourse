const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cacheService = require('../services/cache.service');
const config = require('../config');
const { execSync } = require('child_process');
const logger = require('../utils/logger'); // Ensure logger is imported

// This file sets up and tears down the database for Jest tests.
// It ensures that tests run against a clean database state each time.

beforeAll(async () => {
  logger.info('Starting global test setup...');
  // Connect to Redis for tests
  await cacheService.connectRedis();

  // Clear Redis cache before all tests
  // This needs the client to be ready, so ensure connectRedis is awaited
  if (cacheService.redisClient && cacheService.redisClient.isReady) {
    await cacheService.redisClient.flushdb();
    logger.info('Redis cache flushed.');
  } else {
    logger.warn('Redis client not ready during flushdb in beforeAll.');
  }

  // Ensure test database is ready and migrated
  // For CI/CD, 'migrate deploy' is usually sufficient. For local dev, 'migrate reset' is good for cleanup.
  // Using `prisma migrate reset` to ensure a clean slate, then `prisma migrate deploy` to apply migrations.
  // For production CI, you'd typically use `prisma migrate deploy`.
  // For a robust test setup, you might use a separate test database URL in .env
  try {
    // Reset and apply migrations for a clean test database
    // This assumes your DATABASE_URL in .env (or test-specific .env for CI) points to a test DB.
    execSync('npx prisma migrate reset --force --skip-seed --schema ./prisma/schema.prisma', { stdio: 'inherit' });
    execSync('npx prisma migrate deploy --schema ./prisma/schema.prisma', { stdio: 'inherit' });
    execSync('node seed.js', { stdio: 'inherit' }); // Seed the test database
    logger.info('Test database reset, migrated, and seeded.');
  } catch (error) {
    logger.error('Failed to prepare test database:', error);
    process.exit(1); // Exit if DB setup fails
  }
});

afterAll(async () => {
  logger.info('Starting global test teardown...');
  // Disconnect Prisma
  await prisma.$disconnect();
  logger.info('Disconnected from Prisma.');

  // Disconnect Redis
  if (cacheService.redisClient && cacheService.redisClient.isReady) {
    await cacheService.redisClient.quit(); // Use quit to gracefully close connection
    logger.info('Disconnected from Redis.');
  }
});

// Clear the database and reseed before each test file or test suite
// This ensures that each test runs with a fresh set of data.
beforeEach(async () => {
  // Clearing Redis cache before each test to ensure no test contamination from cache
  if (cacheService.redisClient && cacheService.redisClient.isReady) {
    await cacheService.redisClient.flushdb();
    // logger.debug('Redis cache flushed before each test.');
  }

  // Optional: Reset DB for each test, if full isolation is needed per test
  // This can be slow for many tests. A common strategy is to only reset per file.
  // Or use transactions for each test if the ORM supports it well for faster resets.
  // For Prisma, `migrate reset` is a full DB destroy/recreate, too heavy for `beforeEach`.
  // Instead, individual tests/suites might clean up their own created data.
});

module.exports = prisma;
```

#### Unit Tests (Examples)

##### `src/tests/unit/auth.service.test.js`

```javascript
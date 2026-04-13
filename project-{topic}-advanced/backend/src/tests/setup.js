const { prisma } = require('../config/db');
const { logger } = require('../config/logger');

// Global setup for tests
beforeAll(async () => {
  // Ensure database is clean before running tests.
  // This approach is destructive, use with caution for test environments only.
  logger.info('Test setup: Clearing database...');
  try {
    // Delete data in reverse order of foreign key dependencies
    await prisma.$transaction([
      prisma.scrapeResult.deleteMany(),
      prisma.scrapeJob.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    logger.info('Test setup: Database cleared.');

    // Apply migrations if not already applied (e.g., in CI)
    // In CI, we usually run `prisma migrate deploy` before tests.
    // For local dev, `prisma migrate dev` might be used.
    // This is handled by the CI workflow explicitly.
  } catch (error) {
    logger.error('Test setup: Failed to clear database or apply migrations:', error);
    process.exit(1); // Exit if setup fails
  }
});

// Global teardown for tests
afterAll(async () => {
  logger.info('Test teardown: Disconnecting Prisma client...');
  await prisma.$disconnect();
  logger.info('Test teardown: Prisma client disconnected.');
});
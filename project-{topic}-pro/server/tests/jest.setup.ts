import { AppDataSource } from '../src/config/data-source';
import redisClient from '../src/config/redis';
import { seedDatabase } from '../src/database/seeds/initialSeed';
import logger from '../src/config/logger';

// Set up test database connection before all tests
beforeAll(async () => {
  process.env.NODE_ENV = 'test'; // Ensure test environment is set
  process.env.DB_DATABASE = 'chatdb_test'; // Use a dedicated test database
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
  process.env.REDIS_HOST = 'localhost'; // Ensure Redis points to a local/test instance
  process.env.REDIS_PORT = '6379';

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  // Run migrations
  await AppDataSource.runMigrations();
  // Seed initial data for tests
  await seedDatabase(); // Re-seed for each test run if needed, or clear between tests
  logger.info('Test database setup complete and seeded.');

  // Ensure Redis client is ready
  if (!redisClient.connected) {
    await new Promise<void>((resolve) => {
      redisClient.once('ready', () => {
        logger.info('Redis client ready for tests.');
        resolve();
      });
      redisClient.once('error', (err) => {
        logger.error('Redis connection error in test setup:', err);
        resolve(); // Still proceed, might skip Redis-dependent tests
      });
    });
  }
});

// Clear the database after each test (or truncate tables) for isolation
afterEach(async () => {
    // Implement database clearing logic here
    // Example for TypeORM:
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
        const repository = AppDataSource.getRepository(entity.name);
        await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await seedDatabase(); // Reseed for fresh state
    await redisClient.flushdb(); // Clear Redis cache
});


// Close database connection after all tests
afterAll(async () => {
    logger.info('Test database teardown initiated.');
    await AppDataSource.dropDatabase(); // Drop the test database
    await AppDataSource.destroy();
    await redisClient.quit();
    logger.info('Test database connection and Redis client closed.');
});
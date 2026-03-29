import 'reflect-metadata';
import { AppDataSource } from '@/config/database';
import { getRedisClient, disconnectRedis } from '@/config/redis';
import logger from '@/utils/logger';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

beforeAll(async () => {
  logger.info('Setting up test environment...');
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.dropDatabase(); // Ensure clean state
    await AppDataSource.runMigrations(); // Run migrations for the test DB
    // Seed test data if needed (optional, can also seed per test)
    // await seedTestData(AppDataSource);
    logger.info('Test database initialized and migrations run.');

    await getRedisClient().connect(); // Connect Redis for tests
    logger.info('Redis connected for tests.');
  } catch (error) {
    logger.error('Error during test setup:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  logger.info('Tearing down test environment...');
  try {
    await AppDataSource.destroy();
    logger.info('Test database connection closed.');
    await disconnectRedis();
    logger.info('Redis disconnected for tests.');
  } catch (error) {
    logger.error('Error during test teardown:', error);
    process.exit(1);
  }
});

// Helper to clear DB between tests (if needed, slower)
export const clearDb = async () => {
  if (AppDataSource.isInitialized) {
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    logger.debug('Cleared database tables.');
  }
};
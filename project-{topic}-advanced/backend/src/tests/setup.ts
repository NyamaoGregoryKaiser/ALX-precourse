import { AppDataSource } from '../db/data-source';
import { logger } from '../utils/logger';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      logger.info('Test database connected.');
      // Run migrations for tests
      await AppDataSource.runMigrations();
      logger.info('Test database migrations run.');
    } catch (error) {
      logger.error('Failed to connect or migrate test database:', error);
      process.exit(1);
    }
  }
});

beforeEach(async () => {
  // Clear data before each test for isolation, excluding system tables
  const entities = AppDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
  }
  logger.info('Test database truncated before test.');
});

afterAll(async () => {
  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Test database connection closed.');
  }
});
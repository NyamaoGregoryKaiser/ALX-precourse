import { AppDataSource } from '../src/database/data-source';
import logger from '../src/utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Before all tests, initialize the database connection
beforeAll(async () => {
  logger.info('Jest setup: Initializing database connection for tests...');
  // Use a different database for testing if necessary, configured in .env for Jest
  AppDataSource.options.database = process.env.DB_NAME || 'mlutilshub_test_db';
  AppDataSource.options.host = process.env.DB_HOST || 'localhost';
  AppDataSource.options.port = parseInt(process.env.DB_PORT || '5432');
  AppDataSource.options.username = process.env.DB_USER || 'mlutilshub_test_user';
  AppDataSource.options.password = process.env.DB_PASSWORD || 'test_password';

  await AppDataSource.initialize();
  await AppDataSource.runMigrations(); // Ensure migrations are run for tests
  logger.info('Jest setup: Database connection established and migrations run.');
});

// After all tests, close the database connection
afterAll(async () => {
  logger.info('Jest teardown: Closing database connection...');
  await AppDataSource.destroy();
  logger.info('Jest teardown: Database connection closed.');
});

// Optionally, clean the database before each test
beforeEach(async () => {
  if (AppDataSource.isInitialized) {
    // Clear all tables
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.clear();
    }
    // You might want to re-seed some basic data here for consistency across tests
  }
});
```
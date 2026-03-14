import { AppDataSource } from './config/database'; // Use the main AppDataSource
import { config } from './config/env';
import { logger } from './utils/logger';

// This runs once before all tests
module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test'; // Ensure test environment is set
  config.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/testdb';

  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      logger.info('Test database connection established.');
      // Ensure migrations are run for the test database
      await AppDataSource.runMigrations();
      logger.info('Test database migrations run.');
    } catch (error) {
      logger.error('Failed to initialize test database:', error);
      process.exit(1);
    }
  }
};
import { AppDataSource } from './config/database'; // Use the main AppDataSource
import { logger } from './utils/logger';

// This runs once after all tests
module.exports = async function globalTeardown() {
  if (AppDataSource.isInitialized) {
    try {
      // Revert migrations or clear schema for a clean slate
      // Be careful with this in shared test environments
      await AppDataSource.dropDatabase(); // Drops everything! Use with care.
      await AppDataSource.destroy();
      logger.info('Test database connection closed and schema dropped.');
    } catch (error) {
      logger.error('Failed to tear down test database:', error);
    }
  }
};
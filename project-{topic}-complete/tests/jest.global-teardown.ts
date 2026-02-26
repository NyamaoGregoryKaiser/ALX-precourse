import { AppDataSource } from '../src/database/data-source';
import { getRedisClient } from '../src/utils/redis';
import { execSync } from 'child_process';
import logger from '../src/utils/logger';

/**
 * Global teardown for Jest. This runs once after all test suites.
 * - Reverts migrations.
 * - Destroys database connection.
 * - Closes Redis connection.
 */
export default async function globalTeardown() {
  logger.info('Jest global teardown: Reverting migrations and closing connections...');
  try {
    if (AppDataSource.isInitialized) {
      // Revert all migrations
      logger.info('Reverting database migrations for test environment...');
      execSync(`npm run typeorm migration:revert -- -d src/database/data-source.ts --all`, { stdio: 'inherit' });
      logger.info('Database migrations reverted.');

      await AppDataSource.destroy();
      logger.info('Database connection destroyed.');
    }

    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client closed.');
    }
  } catch (error) {
    logger.error('Jest global teardown failed:', error);
    // Do not exit process in teardown, just log the error
  }
}
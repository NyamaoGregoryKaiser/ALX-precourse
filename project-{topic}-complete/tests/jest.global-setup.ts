import { AppDataSource, connectDB } from '../src/database/data-source';
import { connectRedis } from '../src/utils/redis';
import { execSync } from 'child_process';
import logger from '../src/utils/logger';
import path from 'path';

/**
 * Global setup for Jest. This runs once before all test suites.
 * - Connects to the test database.
 * - Runs migrations to set up schema.
 * - Connects to Redis.
 */
export default async function globalSetup() {
  process.env.NODE_ENV = 'test'; // Ensure test environment for configurations
  process.env.DB_DATABASE = process.env.DB_DATABASE_TEST || 'mobile_backend_test_db'; // Use a dedicated test database

  logger.info('Jest global setup: Connecting to DB and running migrations...');
  try {
    await connectDB();
    await connectRedis();

    // Run migrations using typeorm-ts-node-commonjs
    logger.info('Running database migrations for test environment...');
    const migrationsPath = path.join(process.cwd(), 'src/database/migrations');
    // Ensure the migration command uses the correct data-source for the test env
    // and explicitly specify the migrations path
    execSync(`npm run typeorm migration:run -d src/database/data-source.ts`, { stdio: 'inherit' });
    logger.info('Database migrations completed for test environment.');

  } catch (error) {
    logger.error('Jest global setup failed:', error);
    process.exit(1);
  }
}
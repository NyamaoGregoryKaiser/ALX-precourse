import { AppDataSource } from '../src/database/data-source';
import dotenv from 'dotenv';
import { User } from '../src/database/entities/User.entity';
import { DataSource as DataVizDataSource } from '../src/database/entities/DataSource.entity';
import { Dashboard } from '../src/database/entities/Dashboard.entity';
import { Chart } from '../src/database/entities/Chart.entity';

dotenv.config({ path: '.env.test' }); // Load test specific env variables

// Ensure TypeORM is initialized for tests
beforeAll(async () => {
  // Overwrite environment variables for testing database
  process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.TEST_DB_PORT || '5433'; // Different port for test DB
  process.env.DB_USER = process.env.TEST_DB_USER || 'testuser';
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'testpassword';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'testdb';
  process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test_jwt_secret_key';
  process.env.ENCRYPTION_KEY = process.env.TEST_ENCRYPTION_KEY || 'thisisatestencryptionkey32chars';


  if (!AppDataSource.isInitialized) {
    // Ensure synchronize is true for test DB to create schema
    AppDataSource.options.synchronize = true;
    AppDataSource.options.logging = false; // Suppress logs during tests
    AppDataSource.options.dropSchema = true; // Drop schema before sync to ensure clean state
    await AppDataSource.initialize();
    console.log('Test database initialized and schema synced.');
  }
});

beforeEach(async () => {
  // Clear tables before each test to ensure isolation
  await AppDataSource.getRepository(Dashboard).delete({});
  await AppDataSource.getRepository(Chart).delete({});
  await AppDataSource.getRepository(DataVizDataSource).delete({});
  await AppDataSource.getRepository(User).delete({});
});

afterAll(async () => {
  // Close database connection after all tests
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Test database connection closed.');
  }
});
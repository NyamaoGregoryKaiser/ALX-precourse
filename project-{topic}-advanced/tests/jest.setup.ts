```typescript
import { AppDataSourceInstance } from '../src/database';
import { clearAllCache } from '../src/middleware/cache.middleware';
import logger from '../src/config/logger';

// Before all tests, initialize the database connection
beforeAll(async () => {
  if (!AppDataSourceInstance.isInitialized) {
    // Ensure test database configuration
    AppDataSourceInstance.setOptions({
      database: process.env.DB_NAME_TEST || 'datavizdb_test', // Use a separate test database
      synchronize: false, // Ensure migrations are run manually or via setup script
      logging: false,
    });
    await AppDataSourceInstance.initialize();
    logger.info('Test database initialized.');
  }
});

// Before each test, run migrations and clear data
beforeEach(async () => {
  if (!AppDataSourceInstance.isInitialized) {
    throw new Error('Database not initialized before test setup');
  }
  // This ensures a clean state for each test.
  // In a real project, you might choose to run migrations only once before all tests
  // and then use transactions or specific cleanup for each test.
  // For simplicity and robustness here, we revert and run for each test.
  // For large schemas, this can be slow.
  await AppDataSourceInstance.runMigrations({ transaction: 'all' });
  await AppDataSourceInstance.dropDatabase();
  await AppDataSourceInstance.synchronize(); // Re-create schema based on entities
  await AppDataSourceInstance.runMigrations({ transaction: 'all' }); // Re-run migrations to apply changes from migration files
  // Note: For a true clean slate *before each test*, you'd typically clear table data
  // or use transactional tests that rollback after each test.
  // For this example, dropDatabase and synchronize is simpler but slower.
  // A better approach for speed would be to seed minimal data needed for each test case.
  clearAllCache(); // Clear in-memory cache for each test
});

// After all tests, close the database connection
afterAll(async () => {
  if (AppDataSourceInstance.isInitialized) {
    await AppDataSourceInstance.destroy();
    logger.info('Test database connection closed.');
  }
});
```
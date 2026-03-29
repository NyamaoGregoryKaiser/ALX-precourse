```typescript
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { config } from '../config';

// Ensure tests use a dedicated test database
config.databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/test_database';
config.jwtSecret = 'test_jwt_secret'; // Use a specific secret for tests

/**
 * Global setup for Jest tests.
 * Initializes the database connection before all tests and closes it after all tests.
 * Also handles creating and dropping the test database schema.
 */
beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    // Reconfigure AppDataSource for tests to use `synchronize: true`
    // This allows TypeORM to automatically create schema from entities,
    // which is useful for isolated tests without needing migrations.
    Object.assign(AppDataSource.options, {
      database: 'test_database', // Use a separate test database
      synchronize: true, // Auto-create schema for tests
      logging: false,    // Disable logging during tests
      entities: [`${__dirname}/../entities/**/*.ts`], // Ensure entities are loaded
      migrations: [], // No migrations for testing auto-schema creation
    });
    await AppDataSource.initialize();
    console.log('Test database initialized.');
  }
});

beforeEach(async () => {
  // Clear all data before each test to ensure isolation
  await AppDataSource.dropDatabase();
  await AppDataSource.synchronize(); // Re-create schema
});

afterAll(async () => {
  // Disconnect from the database after all tests are done
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Test database disconnected.');
  }
});
```
```typescript
import { AppDataSource } from '../src/dataSource';
import { logger } from '../src/utils/logger';

// Ensure the database is initialized for tests
beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      logger.info('Test database connected.');
      // Run migrations for tests to ensure schema is up-to-date
      await AppDataSource.runMigrations();
      logger.info('Test database migrations applied.');
    } catch (error) {
      logger.error('Error connecting to test database or running migrations:', error);
      process.exit(1);
    }
  }
});

// Clear database after each test to ensure isolation
afterEach(async () => {
  if (AppDataSource.isInitialized) {
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      // Disable foreign key checks for clearing, if necessary and supported by DB
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    logger.debug('Database tables truncated after test.');
  }
});

// Close database connection after all tests
afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Test database connection closed.');
  }
});
```
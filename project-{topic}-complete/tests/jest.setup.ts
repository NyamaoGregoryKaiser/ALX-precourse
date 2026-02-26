import { AppDataSource } from '../src/database/data-source';
import { clearCache } from '../src/utils/redis';
import logger from '../src/utils/logger';

// Mock logger in test environment to prevent excessive console output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Before each test suite, ensure the database is reset and redis cache is cleared
beforeEach(async () => {
  if (AppDataSource.isInitialized) {
    // Clear all data from test database between tests
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    logger.info('Test database cleared.');
  }
  // Clear Redis cache
  await clearCache();
  logger.info('Redis cache cleared for test.');
});

// After all tests, destroy database connection
afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Test database connection closed.');
  }
});
```

### `tests/jest.global-setup.ts`

```typescript
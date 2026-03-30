import { initializeDataSource, AppDataSource } from '../src/db/data-source';
import { seedDatabase } from '../src/db/seeders';
import { config } from '../src/config';
import { LoggerService } from '../src/utils/logger';
import { RedisService } from '../src/services/cache'; // Assuming you have a RedisService

// Use a separate test database
process.env.DB_NAME = process.env.DB_NAME_TEST || 'scrapeflow_test_db';

const logger = LoggerService.getLogger();

beforeAll(async () => {
  logger.info("Setting up test environment...");
  await initializeDataSource(logger);
  // Ensure migrations run for the test database
  await AppDataSource.runMigrations();
  await AppDataSource.synchronize(true); // Re-sync to ensure schema matches entities (careful with this in real prod)

  // Clear Redis cache before tests
  await RedisService.getClient().flushall();

  // Seed the test database with necessary data
  // await seedDatabase(); // Uncomment if you need seed data for all tests
  logger.info("Test environment setup complete.");
});

// For integration tests, you might want to clear DB between each test or group.
// beforeEach(async () => {
//     // Optionally truncate tables here
//     const entities = AppDataSource.entityMetadatas;
//     for (const entity of entities) {
//         const repository = AppDataSource.getRepository(entity.name);
//         await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
//     }
//     await seedDatabase(); // Re-seed for each test
// });
```
```typescript
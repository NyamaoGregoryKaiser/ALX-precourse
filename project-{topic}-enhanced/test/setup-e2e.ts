```typescript
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Task } from '../src/tasks/entities/task.entity';
import dataSource from '../src/database/data-source'; // Import the default data source

// Load environment variables for the test environment
config({ path: '.env.test' }); // Optional: use a specific .env.test file if needed, otherwise uses default .env

/**
 * Clears all data from the database by dropping the schema.
 * @param dataSource The TypeORM DataSource instance.
 */
export async function clearDatabase(dataSource: DataSource) {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await dataSource.dropDatabase();
  console.log('Database cleared for E2E tests.');
}

/**
 * Runs all TypeORM migrations to set up the database schema.
 * @param dataSource The TypeORM DataSource instance.
 */
export async function runMigrations(dataSource: DataSource) {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await dataSource.runMigrations();
  console.log('Migrations run for E2E tests.');
}

/**
 * Global setup for E2E tests.
 * This runs once before all E2E tests.
 * This file is referenced in `jest-e2e.json` `setupFilesAfterEnv`.
 */
beforeAll(async () => {
  // The actual NestJS app in `app.e2e-spec.ts` will initialize its own DataSource.
  // This setup file is primarily to ensure the DB config is ready for `app.e2e-spec.ts`
  // and to provide utility functions like `clearDatabase` and `runMigrations`.

  // For `jest-e2e.json` to correctly use a test database, ensure your `.env` (or `.env.test`)
  // has a distinct `DATABASE_NAME` for the test environment, e.g., `task_management_db_test`.
  // The `app.e2e-spec.ts` will create and clean this database.
});
```
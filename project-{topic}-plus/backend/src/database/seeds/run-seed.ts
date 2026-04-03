```typescript
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { UserSeeder } from './user.seeder';
import { LoggerService } from '../../logger/logger.service';

const logger = new LoggerService(); // Simple logger for seeding process

async function runSeed() {
  let connection: DataSource | undefined;
  try {
    connection = await dataSource.initialize();
    logger.log('Database connection established for seeding.', 'SeedRunner');

    await connection.transaction(async (manager) => {
      // Run individual seeders here
      logger.log('Running UserSeeder...', 'SeedRunner');
      await new UserSeeder().run(manager);
      logger.log('UserSeeder completed.', 'SeedRunner');

      // Add other seeders here
      // await new OtherSeeder().run(manager);
    });

    logger.log('All seeders executed successfully!', 'SeedRunner');
  } catch (error) {
    logger.error('Seeding failed:', error.stack, 'SeedRunner');
    process.exit(1);
  } finally {
    if (connection && connection.isInitialized) {
      await connection.destroy();
      logger.log('Database connection closed.', 'SeedRunner');
    }
  }
}

void runSeed();
```
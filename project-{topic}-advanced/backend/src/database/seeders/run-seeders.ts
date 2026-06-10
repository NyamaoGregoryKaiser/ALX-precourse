```typescript
import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { UserSeeder } from './UserSeeder';
import { ProjectSeeder } from './ProjectSeeder';
import { TaskSeeder } from './TaskSeeder';
import { logger } from '../../shared/utils/logger';

// List all seeders to run
const seeders = [UserSeeder, ProjectSeeder, TaskSeeder];

async function runSeeders() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected for seeding.');

    for (const Seeder of seeders) {
      const seederInstance = new Seeder(AppDataSource);
      logger.info(`Running seeder: ${Seeder.name}`);
      await seederInstance.run();
    }

    logger.info('All seeders executed successfully!');
  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed after seeding.');
    }
  }
}

runSeeders();
```
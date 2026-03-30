import { AppDataSource } from '../config/data-source';
import logger from '../config/logger';
import { UserSeed } from './user.seed';
import { ProjectSeed } from './project.seed';
import { TaskSeed } from './task.seed';

// Register seed classes here
const seeds = [
  UserSeed,
  ProjectSeed,
  TaskSeed,
];

const runSeeds = async () => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established for seeding.');

    for (const SeedClass of seeds) {
      const seedInstance = new SeedClass();
      logger.info(`Running seed: ${seedInstance.constructor.name}`);
      await seedInstance.run(AppDataSource);
      logger.info(`Seed ${seedInstance.constructor.name} completed.`);
    }

    logger.info('All seeds executed successfully!');
  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed after seeding.');
    }
  }
};

runSeeds();
```

#### `backend/src/seeds/user.seed.ts`
```typescript
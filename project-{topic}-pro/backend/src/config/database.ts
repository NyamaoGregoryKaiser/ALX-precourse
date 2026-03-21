```typescript
import { AppDataSource } from '../ormconfig';
import logger from './logger';

export const connectDB = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database connected successfully!');
    } else {
      logger.info('Database already initialized.');
    }
  } catch (error) {
    logger.error(`Database connection failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database disconnected successfully!');
    }
  } catch (error) {
    logger.error(`Error disconnecting database: ${error instanceof Error ? error.message : error}`);
  }
};
```
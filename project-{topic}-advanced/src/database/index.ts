```typescript
import { DataSource } from 'typeorm';
import config from '../config';
import logger from '../config/logger';
import { User } from './entities/User';
import { DataSource as AppDataSource } from './entities/DataSource';
import { Dataset } from './entities/Dataset';
import { Visualization } from './entities/Visualization';
import { Dashboard } from './entities/Dashboard';

export const AppDataSourceInstance = new DataSource({
  type: 'postgres',
  host: config.DATABASE.HOST,
  port: config.DATABASE.PORT,
  username: config.DATABASE.USERNAME,
  password: config.DATABASE.PASSWORD,
  database: config.DATABASE.DATABASE,
  synchronize: config.DATABASE.SYNCHRONIZE, // Set to false in production, use migrations
  logging: config.DATABASE.LOGGING,
  entities: [User, AppDataSource, Dataset, Visualization, Dashboard],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSourceInstance.initialize();
    logger.info('Database connection initialized successfully!');
  } catch (error) {
    logger.error('Error during database initialization:', error);
    process.exit(1);
  }
};
```
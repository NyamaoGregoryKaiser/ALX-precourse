```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Service } from './entities/Service';
import { MetricDefinition } from './entities/MetricDefinition';
import { DataPoint } from './entities/DataPoint';
import { DATABASE_URL, __prod__, __test__ } from './config/env';
import logger from './utils/logger';
import path from 'path';

// Use a separate database for testing to prevent data contamination
const dbUrl = __test__ ? DATABASE_URL.replace(/perf_monitor_db$/, 'perf_monitor_test_db') : DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  synchronize: false, // In production, use migrations instead of synchronize
  logging: !__prod__ && !__test__, // Log SQL queries in dev, but not in test or prod
  entities: [User, Service, MetricDefinition, DataPoint],
  migrations: [path.join(__dirname, '/migrations/*.ts')],
  subscribers: [],
  ssl: __prod__ ? { rejectUnauthorized: false } : false, // For production databases like Heroku PG
});

export const initializeDataSource = async () => {
  try {
    if (AppDataSource.isInitialized) {
      logger.warn('DataSource already initialized. Skipping re-initialization.');
      return AppDataSource;
    }
    await AppDataSource.initialize();
    logger.info(`Database connected successfully to ${dbUrl}`);
    // Run migrations automatically on startup in non-prod environments or if explicitly configured
    if (!__prod__) {
      logger.info('Running database migrations...');
      await AppDataSource.runMigrations();
      logger.info('Database migrations completed.');
    }
    return AppDataSource;
  } catch (error) {
    logger.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
};
```
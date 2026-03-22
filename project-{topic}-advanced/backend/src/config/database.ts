```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from './index';
import { User } from '../entities/User';
import { Database } from '../entities/Database';
import { SlowQuery } from '../entities/SlowQuery';
import { QueryPlan } from '../entities/QueryPlan';
import { QuerySuggestion } from '../entities/QuerySuggestion';

// This file is used by TypeORM CLI for migrations and by the application
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize, // Set to false in production, use migrations
  logging: config.database.logging,
  entities: [User, Database, SlowQuery, QueryPlan, QuerySuggestion],
  migrations: [__dirname + '/../database/migrations/*.ts'],
  subscribers: [],
});

/**
 * Initializes the database connection.
 * @returns {Promise<DataSource>} The initialized DataSource instance.
 */
export const initializeDatabase = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      console.log('Database connection established.');
    } catch (error) {
      console.error('Error connecting to database:', error);
      process.exit(1); // Exit process if DB connection fails
    }
  }
  return AppDataSource;
};
```

#### `backend/src/entities/User.ts`
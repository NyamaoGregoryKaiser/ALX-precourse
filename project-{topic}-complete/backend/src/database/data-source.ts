```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from '../config';
import logger from '../utils/logger';
import { User } from './entities/User';
import { Room } from './entities/Room';
import { Message } from './entities/Message';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false, // Never use true in production! Use migrations.
  logging: config.env === 'development',
  entities: [User, Room, Message],
  migrations: [path.join(__dirname, 'migrations/*.ts')],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected successfully!');
    // Optionally run migrations here, though it's often done via CLI/CI/CD
    // await AppDataSource.runMigrations();
    // logger.info('Migrations executed successfully!');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1); // Exit process if database connection fails
  }
};
```
```typescript
import { DataSource } from 'typeorm';
import { env } from '../../config/env.config';
import { User } from '../entities/User';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';

// This configuration is used by the TypeORM CLI for migrations.
// It uses `env` for consistency but is generated dynamically by a script for `dist`
// This file is specifically for `typeorm-ts-node-commonjs` CLI usage.

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: false, // Never use synchronize in production! Use migrations.
  logging: env.NODE_ENV === 'development', // Log SQL queries in dev
  entities: [User, Project, Task],
  migrations: [__dirname + '/../migrations/*.ts'],
  subscribers: [],
});
```
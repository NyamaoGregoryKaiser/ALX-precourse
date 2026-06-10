```typescript
// This file is used by the application during runtime.
// It's separated from typeorm.config.ts to avoid direct dependency
// on ts-node for the main application build.

import { DataSource } from 'typeorm';
import { env } from '../../config/env.config';
import { User } from '../entities/User';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: false, // DO NOT USE synchronize: true in production!
  logging: env.NODE_ENV === 'development',
  entities: [User, Project, Task],
  migrations: [__dirname + '/../migrations/*.js'], // Use .js for compiled migrations
  subscribers: [],
});
```
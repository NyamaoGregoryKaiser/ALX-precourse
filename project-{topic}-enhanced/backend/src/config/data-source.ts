import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import config from './index';
import { User } from '../entities/User';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';
import { InitialSeed1700000000000 } from '../migrations/1700000000000-InitialSeed'; // Example migration

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: false, // Set to false in production to use migrations
  logging: config.env === 'development' ? ['query', 'error'] : ['error'],
  entities: [User, Project, Task],
  migrations: [InitialSeed1700000000000], // List all your migrations here
  subscribers: [],
  extra: {
    max: 20, // Max number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
```

#### `backend/src/config/cache.ts` (Caching configuration)
```typescript
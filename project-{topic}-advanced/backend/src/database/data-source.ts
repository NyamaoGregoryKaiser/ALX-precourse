```typescript
import { DataSource } from 'typeorm';
import { env } from '../config';
import { User } from '../entities/User.entity';
import { Project } from '../entities/Project.entity';
import { Monitor } from '../entities/Monitor.entity';
import { Metric } from '../entities/Metric.entity';
import { Alert } from '../entities/Alert.entity';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: env.DB_SYNC, // NEVER true in production! Use migrations.
  logging: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [User, Project, Monitor, Metric, Alert],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  subscribers: [],
});
```
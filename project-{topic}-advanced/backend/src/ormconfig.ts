```typescript
import { DataSourceOptions } from 'typeorm';
import { DATABASE_URL, __prod__ } from './config/env';
import path from 'path';

const config: DataSourceOptions = {
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: false, // Never true in production! Use migrations.
  logging: !__prod__,
  entities: [path.join(__dirname, 'entities/**/*.ts')],
  migrations: [path.join(__dirname, 'migrations/**/*.ts')],
  subscribers: [],
  ssl: __prod__ ? { rejectUnauthorized: false } : false,
};

export default config;
```
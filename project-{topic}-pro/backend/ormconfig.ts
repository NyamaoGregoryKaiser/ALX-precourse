```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envPath) });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false, // Never use true in production! Use migrations.
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [path.join(__dirname, 'src/models/**/*.ts')],
  migrations: [path.join(__dirname, 'src/migrations/**/*.ts')],
  subscribers: [],
  extra: {
    max: 10, // Maximum number of connections in the pool
    min: 2,  // Minimum number of connections in the pool
    idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
  }
};

export const AppDataSource = new DataSource(dataSourceOptions);
```
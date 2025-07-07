```typescript
import { DataSource } from 'typeorm';
import { User } from './src/entities/User'; // Example Entity
import { DataSourceOptions } from 'typeorm/data-source/DataSourceOptions';

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false, // Set to false in production!
  logging: true,
  entities: [User], // Add your entities here
  migrations: ['src/migrations/*.ts'],
  cli: {
    migrationsDir: 'src/migrations',
  },
};

export const AppDataSource = new DataSource(config);
```
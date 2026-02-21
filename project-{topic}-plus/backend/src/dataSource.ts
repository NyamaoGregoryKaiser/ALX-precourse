```typescript
import { DataSource } from 'typeorm';
import { env } from './config/env';
import { User } from './entities/User';
import { DataSource as AppDataSourceEntity } from './entities/DataSource'; // Renamed to avoid conflict
import { Dashboard } from './entities/Dashboard';
import { Chart } from './entities/Chart';
import { UserSubscriber } from './subscribers/UserSubscriber'; // Import subscriber

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false, // Set to true only for development, use migrations in production
  logging: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [User, AppDataSourceEntity, Dashboard, Chart],
  migrations: [__dirname + '/migrations/**/*.ts'],
  subscribers: [UserSubscriber], // Register the subscriber
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Required for some cloud providers
});
```
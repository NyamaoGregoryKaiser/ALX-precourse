```typescript
import { DataSource } from 'typeorm';
import { env } from '../config';
import { User } from './entities/user.entity';
import { DbConnection } from './entities/db-connection.entity';
import { SlowQueryLog } from './entities/slow-query-log.entity';
import { Recommendation } from './entities/recommendation.entity';
import { InitialSchema1700000000000 } from './migrations/1700000000000-InitialSchema'; // Example migration

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: env.NODE_ENV === 'development' || env.NODE_ENV === 'test', // Set to false in production, use migrations
    logging: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [User, DbConnection, SlowQueryLog, Recommendation],
    migrations: [InitialSchema1700000000000], // List all migration files
    subscribers: [],
    migrationsRun: env.NODE_ENV !== 'test', // Run migrations automatically on app start (except for tests)
});
```
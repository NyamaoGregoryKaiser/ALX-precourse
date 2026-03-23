```typescript
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Merchant } from './entities/Merchant';
import { Account } from './entities/Account';
import { Transaction } from './entities/Transaction';
import path from 'path';
import {
    DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, NODE_ENV
} from '../config/constants';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    synchronize: NODE_ENV === 'development' ? false : false, // NEVER use synchronize in production! Use migrations.
    logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [User, Merchant, Account, Transaction],
    migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
    subscribers: [],
    migrationsRun: NODE_ENV === 'production', // Automatically run migrations in production
});
```
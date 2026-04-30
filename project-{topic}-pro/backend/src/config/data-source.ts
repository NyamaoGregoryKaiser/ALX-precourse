```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './index';
import { User } from '../database/entities/User';
import { Task } from '../database/entities/Task';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: config.nodeEnv === 'development' ? false : false, // Never use synchronize in production! Use migrations.
    logging: config.nodeEnv === 'development' ? ['query', 'error'] : ['error'],
    entities: [User, Task],
    migrations: [__dirname + '/../database/migrations/*.ts'],
    subscribers: [],
});

export { AppDataSource };
```
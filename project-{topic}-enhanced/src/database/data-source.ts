```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Task } from '../tasks/entities/task.entity';

// Load environment variables for TypeORM CLI usage
config();

// Configuration for TypeORM CLI
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: [User, Category, Task],
  migrations: [__dirname + '/migrations/*.ts'], // Path to migration files
};

// Export the DataSource instance
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
```
```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { config } from 'dotenv';
import { SeederOptions } from 'typeorm-extension';
import { MainSeeder } from '../../../seeds/main.seeder';

config(); // Load .env file

const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Post], // Add all your entities here
  migrations: [__dirname + '/../../migrations/**/*.ts'], // Path to your migration files
  synchronize: process.env.NODE_ENV === 'development' ? false : false, // Disable synchronize in production! Use migrations.
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  seeds: [MainSeeder], // Register your main seeder
};

export const AppDataSource = new DataSource(dataSourceOptions);
```
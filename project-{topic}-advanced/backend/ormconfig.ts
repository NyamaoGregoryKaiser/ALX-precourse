```typescript
// This file is used by TypeORM CLI for migrations.
// It uses `process.env` directly, but in a real app, you might want to load dotenv here too.
import { DataSource } from 'typeorm';
import { User } from './src/entities/User';
import { Role } from './src/entities/Role';
import { BlacklistedToken } from './src/entities/BlacklistedToken';
import { Post } from './src/entities/Post'; // Example entity

require('dotenv').config(); // Load environment variables for TypeORM CLI

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'auth_db',
  synchronize: false, // NEVER use true in production, use migrations!
  logging: true,
  entities: [User, Role, BlacklistedToken, Post],
  migrations: ['./src/migrations/**/*.ts'],
  subscribers: [],
});

export default AppDataSource;
```
// This file is used by TypeORM CLI for migrations.
// It's a simplified version of data-source.ts to be directly consumable by TypeORM CLI.
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' }); // Load environment variables

const AppDataSourceCLI = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chat_db',
  synchronize: false,
  logging: true,
  entities: [
    path.join(__dirname, 'src/database/entities/*.ts'),
  ],
  migrations: [
    path.join(__dirname, 'src/database/migrations/*.ts'),
  ],
  subscribers: [],
});

export default AppDataSourceCLI;
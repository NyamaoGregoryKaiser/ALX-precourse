import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envPath });

const isTest = process.env.NODE_ENV === 'test';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: isTest ? process.env.DB_DATABASE_TEST : process.env.DB_DATABASE,
  synchronize: false, // Should be false in production
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, 'src/entities/**/*.ts')],
  migrations: [path.join(__dirname, 'src/migrations/**/*.ts')],
  subscribers: [path.join(__dirname, 'src/subscribers/**/*.ts')],
});

export default AppDataSource;
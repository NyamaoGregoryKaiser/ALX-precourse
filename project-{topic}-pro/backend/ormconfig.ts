import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'alxpay',
  synchronize: process.env.NODE_ENV === 'development' ? false : false, // Never use true in production!
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [path.join(__dirname, './src/entities/*.ts')],
  migrations: [path.join(__dirname, './src/migrations/*.ts')],
  subscribers: [path.join(__dirname, './src/subscribers/*.ts')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
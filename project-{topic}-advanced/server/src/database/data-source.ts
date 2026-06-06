import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from './entities/User.entity';
import { DataSource as DataVizDataSource } from './entities/DataSource.entity';
import { Dashboard } from './entities/Dashboard.entity';
import { Chart } from './entities/Chart.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false, // Set to true for development, false for production with migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [User, DataVizDataSource, Dashboard, Chart],
  migrations: [__dirname + '/migrations/*.ts'],
  subscribers: [],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // For Render/Heroku etc.
});
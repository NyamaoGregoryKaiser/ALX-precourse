import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from './entities/User';
import { DataSource as DataVizDataSource } from './entities/DataSource';
import { Dashboard } from './entities/Dashboard';
import { Visualization } from './entities/Visualization';
import path from 'path';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false, // Set to true only for development, use migrations in production
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [User, DataVizDataSource, Dashboard, Visualization],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  subscribers: [],
  extra: {
    max: 10, // Max number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection is not established
  },
});
import { DataSource } from 'typeorm';
import {
  DB_TYPE, DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, NODE_ENV
} from '../config';
import logger from '../utils/logger';
import { User } from './entities/User.entity';
import { Product } from './entities/Product.entity';
import { Category } from './entities/Category.entity';
import { Order } from './entities/Order.entity';
import { OrderItem } from './entities/OrderItem.entity';
import { Review } from './entities/Review.entity';
import path from 'path';

export const AppDataSource = new DataSource({
  type: DB_TYPE as "postgres", // TypeORM expects specific string literal
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  synchronize: false, // Set to true only for development, use migrations in production
  logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'], // Log SQL queries in dev
  entities: [
    User,
    Product,
    Category,
    Order,
    OrderItem,
    Review,
  ],
  migrations: [path.join(__dirname, 'migrations/*.ts')], // Path to migration files
  subscribers: [],
  // SSL configuration for production if needed (e.g., Heroku Postgres)
  // ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Initializes and connects to the database.
 */
export const connectDB = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    logger.info('Database already initialized.');
    return;
  }
  try {
    await AppDataSource.initialize();
    logger.info('Data Source has been initialized!');
  } catch (err) {
    logger.error('Error during Data Source initialization:', err);
    throw err; // Re-throw to be caught by the server startup process
  }
};
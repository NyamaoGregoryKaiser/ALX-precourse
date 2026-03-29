```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './index';
import { User } from '../entities/User';
import { Product } from '../entities/Product';

/**
 * Initializes and returns the TypeORM DataSource.
 * This DataSource is used to interact with the PostgreSQL database.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  synchronize: false, // Set to true only for development, use migrations for production
  logging: config.nodeEnv === 'development' ? ['query', 'error'] : ['error'], // Log SQL queries in dev
  entities: [User, Product],
  migrations: [`${__dirname}/../migrations/**/*.ts`], // Point to your migration files
  subscribers: [],
  // SSL configuration for production environments like Heroku or other cloud providers
  ssl: config.nodeEnv === 'production' ? {
    rejectUnauthorized: false, // Required for some cloud providers
  } : false,
});

/**
 * Connects to the database using the initialized DataSource.
 * This function handles the connection and any initial setup or error logging.
 * @returns Promise<void>
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1); // Exit the process if database connection fails
  }
};

/**
 * Disconnects from the database.
 * Useful for graceful shutdown or testing cleanup.
 * @returns Promise<void>
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection disconnected.');
    }
  } catch (error) {
    console.error('Error during database disconnection:', error);
  }
};
```
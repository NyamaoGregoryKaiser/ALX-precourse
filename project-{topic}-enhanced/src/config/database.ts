```typescript
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Project } from "../entities/Project";
import { ScrapingTask } from "../entities/ScrapingTask";
import { ScrapingResult } from "../entities/ScrapingResult";
import { environment } from "./environment";
import { InitialSchema1678888888888 } from "../database/migrations/1678888888888-InitialSchema";
import { logger } from "../utils/logger";

/**
 * @file Configures and initializes the TypeORM data source for PostgreSQL.
 *
 * This module defines the `AppDataSource` instance, which is used throughout
 * the application to interact with the database. It includes entity definitions,
 * migration scripts, and database connection parameters from environment variables.
 */

export const AppDataSource = new DataSource({
  type: "postgres",
  host: environment.dbHost,
  port: environment.dbPort,
  username: environment.dbUser,
  password: environment.dbPassword,
  database: environment.dbName,
  synchronize: false, // WARNING: NEVER USE synchronize IN PRODUCTION! It can lead to data loss.
                     // Use migrations for schema evolution in production environments.
  logging: environment.nodeEnv === 'development' ? ["query", "error"] : ["error"], // Log SQL queries in dev
  entities: [User, Project, ScrapingTask, ScrapingResult],
  migrations: [InitialSchema1678888888888], // List your migrations here
  subscribers: [],
  ssl: environment.dbSsl ? { rejectUnauthorized: false } : false, // Adjust SSL options as per your DB provider
});

/**
 * Initializes the database connection.
 * @returns {Promise<void>} A promise that resolves when the database connection is established.
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info("Database connection initialized successfully.");

      // Run migrations automatically in development (optional, but convenient)
      if (environment.nodeEnv === 'development') {
        logger.info("Running pending database migrations...");
        await AppDataSource.runMigrations();
        logger.info("Database migrations completed.");
      }
    } else {
      logger.info("Database already initialized.");
    }
  } catch (error) {
    logger.error("Error during database initialization:", error);
    process.exit(1); // Exit process if database connection fails
  }
};

/**
 * Closes the database connection.
 * @returns {Promise<void>} A promise that resolves when the database connection is closed.
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info("Database connection closed.");
    }
  } catch (error) {
    logger.error("Error during database shutdown:", error);
  }
};
```
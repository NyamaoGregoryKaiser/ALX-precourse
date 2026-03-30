import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Scraper } from "../entities/Scraper";
import { ScrapeJob } from "../entities/ScrapeJob";
import { ScrapedData } from "../entities/ScrapedData";
import { config } from '../config';
import { Logger } from 'winston';

let appLogger: Logger; // Will be initialized by the main logger

export const AppDataSource = new DataSource({
    type: "postgres",
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    synchronize: false, // IMPORTANT: Never true in production. Use migrations.
    logging: config.env === 'development' ? ["query", "error"] : ["error"], // Log queries in dev
    entities: [User, Scraper, ScrapeJob, ScrapedData],
    migrations: [__dirname + "/migrations/*.ts"],
    subscribers: [],
});

export const initializeDataSource = async (logger: Logger) => {
    appLogger = logger; // Assign the logger
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            appLogger.info("Data Source has been initialized!");
        } else {
            appLogger.info("Data Source already initialized.");
        }
    } catch (err) {
        appLogger.error("Error during Data Source initialization", err);
        process.exit(1); // Exit process if DB connection fails
    }
};

// Export individual repositories for direct use
export const UserRepository = AppDataSource.getRepository(User);
export const ScraperRepository = AppDataSource.getRepository(Scraper);
export const ScrapeJobRepository = AppDataSource.getRepository(ScrapeJob);
export const ScrapedDataRepository = AppDataSource.getRepository(ScrapedData);

// Function to run migrations
export const runMigrations = async () => {
    if (AppDataSource.isInitialized) {
        await AppDataSource.runMigrations();
        appLogger.info("Database migrations completed.");
    } else {
        appLogger.error("Data Source not initialized. Cannot run migrations.");
    }
};
import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./env";
import { User } from "../entities/user.entity";
import { Workspace } from "../entities/workspace.entity";
import { Project } from "../entities/project.entity";
import { Task } from "../entities/task.entity";
import { Comment } from "../entities/comment.entity";
import { Tag } from "../entities/tag.entity";
import { logger } from "../utils/logger";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: config.DATABASE_URL,
    synchronize: config.NODE_ENV === 'development' ? false : false, // Disable synchronize in production! Use migrations.
    logging: config.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [User, Workspace, Project, Task, Comment, Tag],
    migrations: [__dirname + "/../migrations/**/*.ts"],
    subscribers: [],
    // You might want to use a connection pool in production
    extra: {
        max: 20, // Max number of connections in the pool
        min: 5,  // Min number of connections in the pool
        idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
    },
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Adjust for production SSL
});

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        logger.info("Database connection established successfully.");

        // Run migrations automatically in development/test, or manually in production
        if (config.NODE_ENV !== 'production') {
            await AppDataSource.runMigrations();
            logger.info("Database migrations run successfully.");
        }
    } catch (error) {
        logger.error("Error connecting to database:", error);
        process.exit(1); // Exit process on DB connection failure
    }
};
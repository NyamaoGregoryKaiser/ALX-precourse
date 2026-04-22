```typescript
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { User } from "./entities/User";
import { DataSource as DataSrcEntity } from "./entities/DataSource";
import { Dashboard } from "./entities/Dashboard";
import { Chart } from "./entities/Chart";
import { config } from 'dotenv';

config(); // Load environment variables

const dataSourceOptions: DataSourceOptions = {
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: false, // NEVER set to true in production! Use migrations.
    logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [User, DataSrcEntity, Dashboard, Chart],
    migrations: [__dirname + "/migrations/*.ts"],
    subscribers: [],
    migrationsRun: true, // Automatically run migrations when app starts
};

export const AppDataSource = new DataSource(dataSourceOptions);

export const initializeDatabase = async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log("Database connected and migrations run successfully!");
        }
    } catch (error) {
        console.error("Error during database initialization:", error);
        process.exit(1); // Exit process if DB connection fails
    }
};
```
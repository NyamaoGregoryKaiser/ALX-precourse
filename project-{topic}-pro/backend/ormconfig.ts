```typescript
// This file is used by the TypeORM CLI to run migrations.
// Make sure it points to your DataSource configuration.
import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';

// Load environment variables for TypeORM CLI
config();

const dataSourceOptions: DataSourceOptions = {
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: false, // Should be false in production, migrations handle schema
    logging: false,
    entities: [__dirname + "/src/database/entities/*.ts"],
    migrations: [__dirname + "/src/database/migrations/*.ts"],
    seeds: [__dirname + "/src/database/seeders/*.ts"], // Example for future seeder integration
    migrationsRun: true // Automatically run migrations on startup (can be false for manual control)
};

export default dataSourceOptions;
```
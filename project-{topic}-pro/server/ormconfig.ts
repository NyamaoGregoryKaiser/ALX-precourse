import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' }); // Load .env from root

const config: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'chatuser',
    password: process.env.DB_PASSWORD || 'chatpassword',
    database: process.env.DB_DATABASE || 'chatdb',
    synchronize: false, // NEVER use true in production!
    logging: process.env.NODE_ENV === 'development',
    entities: [__dirname + '/src/database/entities/**/*.ts'],
    migrations: [__dirname + '/src/database/migrations/**/*.ts'],
    seeds: [__dirname + '/src/database/seeds/**/*.ts'], // Not directly used by TypeORM CLI, but useful for structuring
    subscribers: [],
};

export default config;
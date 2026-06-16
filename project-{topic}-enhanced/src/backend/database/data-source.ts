import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from '../config';
import { User } from '../entities/User';
import { Project } from '../entities/Project';
import { Task } from '../entities/Task';
import { CreateInitialSchema1678... as CreateInitialSchema } from './migrations/1678...initial';
import { SeedInitialData1678... as SeedInitialData } from './migrations/1678...seed';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: config.database.sync, // Set to false in production, use migrations
    logging: config.database.logging,
    entities: [User, Project, Task],
    migrations: [CreateInitialSchema, SeedInitialData], // Ensure migrations are listed
    subscribers: [],
});
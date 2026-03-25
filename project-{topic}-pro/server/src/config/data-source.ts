import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../database/entities/User';
import { ChatRoom } from '../database/entities/ChatRoom';
import { Message } from '../database/entities/Message';
import { ChatRoomParticipant } from '../database/entities/ChatRoomParticipant';
import { InitialSchema1700000000000 } from '../database/migrations/1700000000000-InitialSchema';

// Load environment variables from the root .env file first
dotenv.config({ path: __dirname + '/../../.env' });
// Then load from server/.env, overwriting if duplicates exist
dotenv.config({ path: __dirname + '/../.env', override: true });

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'chatuser',
    password: process.env.DB_PASSWORD || 'chatpassword',
    database: process.env.DB_DATABASE || 'chatdb',
    synchronize: false, // Never use true in production! Use migrations.
    logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [User, ChatRoom, Message, ChatRoomParticipant],
    migrations: [InitialSchema1700000000000], // List all your migrations here
    subscribers: [],
});

export const initializeDataSource = async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('Data Source has been initialized!');
        }
    } catch (err) {
        console.error('Error during Data Source initialization:', err);
        // Exit process or handle error gracefully in production
        process.exit(1);
    }
};
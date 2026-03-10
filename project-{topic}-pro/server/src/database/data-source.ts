import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Conversation } from './entities/Conversation';
import { Message } from './entities/Message';
import { ConversationParticipant } from './entities/ConversationParticipant';
import { config } from '../config';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.dbHost,
  port: config.dbPort,
  username: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  synchronize: false, // Set to true for development, false for production with migrations
  logging: config.nodeEnv === 'development' ? ['query', 'error', 'schema'] : ['error'],
  entities: [User, Conversation, Message, ConversationParticipant],
  migrations: [path.join(__dirname, 'migrations/*.ts')],
  subscribers: [],
  extra: {
    max: 10, // Max number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  }
});
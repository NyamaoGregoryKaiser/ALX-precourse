import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

// Initialize Prisma Client
// It's a good practice to use a single PrismaClient instance for your application.
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

// Connect to the database on application start
export async function connectDb() {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to the database.');
  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    process.exit(1); // Exit process if database connection fails
  }
}

// Disconnect from the database on application shutdown
export async function disconnectDb() {
  try {
    await prisma.$disconnect();
    logger.info('Disconnected from the database.');
  } catch (error) {
    logger.error('Error disconnecting from the database:', error);
  }
}

export default prisma;
```
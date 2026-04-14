import app from './app';
import config from './config';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { connectRedis } from './utils/redisClient';

const prisma = new PrismaClient();
const PORT = config.port;

async function startServer() {
  try {
    // Connect to PostgreSQL via Prisma
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Connect to Redis
    await connectRedis();
    logger.info('Connected to Redis');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
    });
  } catch (error) {
    logger.error('Failed to connect to database or start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
import app from './app';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully.');

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode.`);
      logger.info(`API documentation available at http://localhost:${config.port}${config.apiVersion}/docs`);
    });
  } catch (error) {
    logger.error('Failed to connect to the database or start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`, err);
  // Close server & exit process
  prisma.$disconnect().then(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, err);
  // Close server & exit process
  prisma.$disconnect().then(() => {
    process.exit(1);
  });
});
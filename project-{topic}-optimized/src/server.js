const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const prisma = require('../prisma/client');
const cacheService = require('./services/cache.service');

let server;

const startServer = async () => {
  try {
    // Connect to PostgreSQL database
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Connect to Redis cache
    await cacheService.connectRedis();

    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit with failure code
  }
};

const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      await prisma.$disconnect();
      logger.info('Disconnected from PostgreSQL');
      // No explicit disconnect for Redis needed if client handles it on process exit
      process.exit(1);
    });
  } else {
    await prisma.$disconnect();
    logger.info('Disconnected from PostgreSQL');
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(() => {
      logger.info('Server closed gracefully due to SIGTERM');
    });
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  if (server) {
    server.close(() => {
      logger.info('Server closed gracefully due to SIGINT');
    });
  }
});

// Start the server
startServer();
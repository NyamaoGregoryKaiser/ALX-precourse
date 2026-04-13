const app = require('./app');
const { logger } = require('./config/logger');
const { startJobProcessor } = require('./services/jobQueueService');
const { prisma } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Start the job processing loop
    startJobProcessor();
    logger.info('Scraping job processor started');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit with failure code
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally, perform graceful shutdown or just log
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Perform graceful shutdown for uncaught exceptions
  process.exit(1);
});
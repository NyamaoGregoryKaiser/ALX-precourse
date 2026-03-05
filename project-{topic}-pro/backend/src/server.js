const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { scraperWorker, setupScheduledScrapers } = require('./jobs/scraperConsumer'); // Import worker and scheduler setup
require('./database/connection'); // Ensure database connection is established

let server;

const startServer = async () => {
  try {
    // Start BullMQ worker
    await scraperWorker.run();
    logger.info('BullMQ Scraper Worker started.');

    // Setup scheduled jobs from database
    await setupScheduledScrapers();

    // Start Express server
    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} (http://localhost:${config.port})`);
      logger.info(`Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
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
    server.close();
  }
});
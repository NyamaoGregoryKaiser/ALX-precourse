import app from './app';
import AppDataSource from '../ormconfig';
import { config } from './config';
import logger from './utils/logger';

const startServer = async () => {
  try {
    // Initialize TypeORM Data Source
    await AppDataSource.initialize();
    logger.info('Database connection established successfully.');

    // Start the Express server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode.`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err.name, err.message, err.stack);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      logger.error(err.name, err.message, err.stack);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to connect to the database or start server:', error);
    process.exit(1);
  }
};

startServer();
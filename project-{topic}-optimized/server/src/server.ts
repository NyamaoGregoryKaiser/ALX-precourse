import 'reflect-metadata'; // Must be imported once at the top of your application for TypeORM
import app from './app';
import { AppDataSource } from './database/data-source';
import logger from './utils/logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    logger.info('Database connected successfully!');
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1); // Exit process on database connection failure
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```
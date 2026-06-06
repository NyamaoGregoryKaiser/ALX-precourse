import 'reflect-metadata'; // Required for TypeORM
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './database/data-source';
import app from './app';
import { logger } from './middleware/logger.middleware';

const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
  .then(() => {
    logger.info('Database connected successfully!');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection error:', error);
    process.exit(1);
  });
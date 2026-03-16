import 'reflect-metadata'; // Must be imported before TypeORM initialization
import app from './app';
import { AppDataSource } from './db/data-source';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
  .then(() => {
    logger.info('Database connected successfully!');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed!', error);
    process.exit(1);
  });
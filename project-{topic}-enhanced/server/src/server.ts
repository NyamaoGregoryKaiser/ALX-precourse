import 'reflect-metadata'; // Must be imported before TypeORM initialization
import app from '@/app';
import { AppDataSource } from '@/config/database';
import { connectRedis } from '@/config/redis';
import logger from '@/utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`) });

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await AppDataSource.initialize();
    logger.info('Connected to PostgreSQL database successfully.');

    // Connect to Redis
    await connectRedis();
    logger.info('Connected to Redis successfully.');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
    });
  } catch (error) {
    logger.error('Failed to connect to database or start server:', error);
    process.exit(1);
  }
};

startServer();
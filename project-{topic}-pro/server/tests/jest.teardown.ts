import { AppDataSource } from '../src/config/data-source';
import redisClient from '../src/config/redis';
import logger from '../src/config/logger';

const globalTeardown = async () => {
  logger.info('Global Teardown: Closing remaining connections...');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  if (redisClient.connected) {
    await redisClient.quit();
  }
  logger.info('Global Teardown: All connections closed.');
};

export default globalTeardown;
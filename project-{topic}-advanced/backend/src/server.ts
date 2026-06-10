```typescript
import 'reflect-metadata'; // Required for TypeORM and other decorators
import app from './app';
import { AppDataSource } from './database/config/data-source';
import { logger } from './shared/utils/logger';
import { setupRedis } from './config/redis.config';
import { env } from './config/env.config';

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Initialize Database Connection
    await AppDataSource.initialize();
    logger.info('Database connected successfully!');

    // Initialize Redis Connection
    await setupRedis();
    logger.info('Redis connected successfully!');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode.`);
      logger.info(`Access API at http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to connect to database or start server:', error);
    process.exit(1); // Exit with a failure code
  }
}

startServer();
```
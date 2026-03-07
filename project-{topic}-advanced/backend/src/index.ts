```typescript
import 'reflect-metadata'; // Must be imported once at the top of your entry file
import app from './app';
import { PORT } from './config/env';
import { initializeDataSource } from './data-source';
import { connectRedis } from './config/redis';
import logger from './utils/logger';

const startServer = async () => {
  try {
    // Initialize Database
    await initializeDataSource();

    // Connect to Redis
    await connectRedis();

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Access API at http://localhost:${PORT}/api/v1`);
      logger.info(`Prometheus metrics at http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```
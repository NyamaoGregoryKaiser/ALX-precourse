```typescript
import 'reflect-metadata'; // Must be imported before TypeORM
import { AppDataSource } from './database/data-source';
import { app } from './app';
import { env } from './config';
import logger from './utils/logger';
import { startMonitorScheduler } from './jobs/monitor-scheduler';
import { collectDefaultMetrics } from './utils/prometheus.utils';

const startServer = async () => {
  try {
    // Initialize Database Connection
    await AppDataSource.initialize();
    logger.info('Database connected successfully!');

    // Start Express Server
    const port = env.PORT;
    app.listen(port, () => {
      logger.info(`Server running on port ${port} (http://localhost:${port})`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API Version: ${env.API_VERSION}`);
    });

    // Start Monitor Scheduler
    startMonitorScheduler();

    // Collect default Prometheus metrics for the application itself
    collectDefaultMetrics();

  } catch (error) {
    logger.error('Failed to connect to database or start server:', error);
    process.exit(1);
  }
};

startServer();
```
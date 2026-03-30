import app from './app';
import { AppDataSource } from './config/data-source';
import config from './config';
import logger from './config/logger';
import { initCache } from './config/cache';

let server: any;

const initializeApp = async () => {
  try {
    // Initialize Database
    await AppDataSource.initialize();
    logger.info('Connected to PostgreSQL database');

    // Initialize Cache
    await initCache();
    logger.info('Cache initialized');

    // Start Express server
    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
    });
  } catch (error) {
    logger.error('Database connection or server startup failed:', error);
    process.exit(1);
  }
};

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

const unexpectedErrorHandler = (error: Error) => {
  logger.error('Unhandled error:', error);
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

initializeApp();
```

#### `backend/src/subscribers/AuditSubscriber.ts` (Example TypeORM Subscriber for auditing/logging changes)
```typescript
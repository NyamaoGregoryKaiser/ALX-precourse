```typescript
import 'reflect-metadata'; // Must be imported first for TypeORM
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './dataSource';
import { app } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
  .then(async () => {
    logger.info('Database connected successfully.');

    // Run migrations automatically
    await AppDataSource.runMigrations();
    logger.info('Database migrations applied.');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    logger.error('Error connecting to database:', error);
    process.exit(1);
  });

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1);
});
```
```typescript
import app from './app';
import http from 'http';
import { initializeDatabase, AppDataSource } from './database/data-source';
import logger from './utils/logger';
import config from './config';
import { initializeSocketIO } from './sockets/socketManager';
import { initializeCache } from './utils/cache';

const server = http.createServer(app);
let io: any; // Socket.IO server instance

const startServer = async () => {
  try {
    // Initialize Database
    await initializeDatabase();

    // Initialize Cache
    await initializeCache();

    // Start Socket.IO
    initializeSocketIO(server);

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Access API: http://localhost:${config.port}/api/v1`);
      logger.info(`Access Socket.IO: ws://localhost:${config.port}/socket.io`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      if (AppDataSource.isInitialized) {
        AppDataSource.destroy().then(() => logger.info('Database connection closed.')).catch(e => logger.error('Error closing database connection:', e));
      }
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
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at Promise: ${promise}, reason: ${reason}`);
  exitHandler();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

startServer();

export { server, io }; // Export server and io for testing if needed
```
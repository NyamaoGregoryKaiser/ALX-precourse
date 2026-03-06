```javascript
import http from 'http';
import app, { setupSocketIO } from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const server = http.createServer(app);
const io = setupSocketIO(server); // Initialize Socket.IO with the HTTP server

let activeServer = server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
});

const exitHandler = () => {
  if (activeServer) {
    activeServer.close(() => {
      logger.info('Server closed');
      prisma.$disconnect(); // Disconnect Prisma client
      process.exit(1);
    });
  } else {
    prisma.$disconnect();
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (activeServer) {
    activeServer.close();
  }
});

export { io }; // Export io for potential use in tests or other modules
```
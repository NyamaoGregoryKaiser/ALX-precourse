import app from './app.js';
import config from '../config/config.js';
import logger from './utils/logger.js';
import prisma from './utils/prisma.js';

let server;

// Function to handle graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      prisma.$disconnect().then(() => {
        logger.info('Prisma client disconnected.');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

// Start the server
prisma.$connect()
  .then(() => {
    logger.info('Connected to PostgreSQL database');
    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to database', err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err);
  process.exit(1);
});

// Handle SIGTERM (e.g., from Docker stop)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Initiating graceful shutdown.');
  gracefulShutdown();
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('SIGINT received. Initiating graceful shutdown.');
  gracefulShutdown();
});
```

```javascript
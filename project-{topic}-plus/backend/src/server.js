```javascript
const app = require('./app');
const db = require('./database');
const logger = require('./utils/logger');
const appConfig = require('./config/app');

const startServer = async () => {
  try {
    // Connect to PostgreSQL database
    await db.connect();

    // Start the Express server
    const server = app.listen(appConfig.port, () => {
      logger.info(`Server is running on port ${appConfig.port} in ${appConfig.env} mode.`);
      logger.info(`API Documentation: http://localhost:${appConfig.port}/api-docs`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', err);
      server.close(() => {
        process.exit(1); // Exit with failure code
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
      server.close(() => {
        process.exit(1); // Exit with failure code
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit with failure code
  }
};

startServer();
```
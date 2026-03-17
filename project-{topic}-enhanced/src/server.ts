```typescript
import { createApp } from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { environment } from './config/environment';
import { logger } from './utils/logger';
import { ScraperService } from './services/ScraperService'; // Import ScraperService to manage its lifecycle

/**
 * @file Main application entry point.
 *
 * This module initializes the database, creates the Express application,
 * and starts the server. It also handles graceful shutdown.
 */

const startServer = async () => {
  // Initialize database connection
  await initializeDatabase();

  const app = createApp();
  const PORT = environment.port;

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${environment.nodeEnv} mode.`);
    logger.info(`Access API at http://localhost:${PORT}/api`);
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    logger.info('Shutting down server...');

    // Close HTTP server
    server.close(async () => {
      logger.info('HTTP server closed.');

      // Close database connection
      await closeDatabase();

      // Close Puppeteer browser if it was initialized
      const scraperService = new ScraperService(); // Create a temp instance to access closeBrowser
      await scraperService.closeBrowser();

      logger.info('Application gracefully shut down.');
      process.exit(0);
    });

    // If server takes too long to shut down, force exit
    setTimeout(() => {
      logger.error('Forcefully shutting down after timeout.');
      process.exit(1);
    }, 10000); // 10 seconds timeout
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally, perform graceful shutdown here
    // gracefulShutdown();
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    // Always exit process after uncaught exception
    gracefulShutdown();
  });
};

startServer();
```
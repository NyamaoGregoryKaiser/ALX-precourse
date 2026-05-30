const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
// Ensure DB connection is established when server starts
require('./utils/db');
require('./utils/redis'); // Initialize Redis client

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.env} mode.`);
});

// Handle graceful shutdown
const shutdown = () => {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server gracefully terminated.');
    process.exit(0);
  });

  // Force close if server doesn't close after 10 seconds
  setTimeout(() => {
    logger.error('Forcefully terminating server.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = server; // For testing
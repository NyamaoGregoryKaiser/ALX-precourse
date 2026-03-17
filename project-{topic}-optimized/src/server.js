require('dotenv').config(); // Load environment variables first
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const knex = require('knex');
const knexConfig = require('./db/knexfile');

// Initialize Knex with the appropriate configuration based on environment
const db = knex(knexConfig[config.env]);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connected successfully.');
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1); // Exit process if DB connection fails
  });

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.env} mode`);
  logger.info(`Access API docs at http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err.message, err);
  server.close(() => {
    process.exit(1); // Exit process after closing server
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message, err);
  server.close(() => {
    process.exit(1); // Exit process after closing server
  });
});

// Export server for testing purposes
module.exports = server;
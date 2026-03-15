require('dotenv').config();
const http = require('http');
const app = require('./app');
const sequelize = require('./db/models').sequelize;
const logger = require('./middleware/logger');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const startServer = async () => {
  try {
    // Test database connection and run migrations
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Run migrations on server start (optional, can be done manually)
    // In production, migrations are usually run as a separate step.
    // await sequelize.sync({ alter: true }); // This will create/alter tables
    // To run migrations using CLI, use `npm run db:migrate`

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  process.exit(1);
});
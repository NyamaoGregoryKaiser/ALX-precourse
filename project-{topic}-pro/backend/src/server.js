const app = require('./app');
const config = require('./config/config');
const { sequelize } = require('./db/sequelize');
const logger = require('./utils/logger');

const startServer = async () => {
  try {
    // Test database connection and synchronize models
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // In production, migrations should be handled separately
    // For development/testing, auto-sync can be convenient
    if (config.env !== 'production') {
      await sequelize.sync({ alter: true }); // Use {force: true} for fresh start, {alter: true} for schema updates
      logger.info('Database models synchronized.');
    } else {
      logger.info('In production, skipping automatic database synchronization. Ensure migrations are run.');
    }

    // Start the Express server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode.`);
      logger.info(`Access API at http://localhost:${config.port}/api`);
      logger.info(`Access API Docs at http://localhost:${config.port}/api-docs`);
    });

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
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error('Unable to connect to the database or start server:', error);
    process.exit(1); // Exit with failure code
  }
};

startServer();
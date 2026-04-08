const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./config/logger');
const redisClient = require('./config/redis');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Sync models with the database (use migrations in production)
    // await sequelize.sync({ alter: true }); // Use `alter: true` carefully in production
    // logger.info('Database synchronized (models synced).');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connection has been established successfully.');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start the server:', error);
    process.exit(1); // Exit with failure code
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  if (err.stack) {
    logger.error(err.stack);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (err.stack) {
    logger.error(err.stack);
  }
  process.exit(1);
});
```
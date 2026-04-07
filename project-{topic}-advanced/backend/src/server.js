require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./db/models');
const config = require('./config/config');
const logger = require('./config/logger.config');
const { connectRedis } = require('./config/redis.config');

const PORT = config.port;

let server;

// Connect to PostgreSQL and sync models
sequelize.authenticate()
  .then(() => {
    logger.info('Connected to PostgreSQL');
    // For production, prefer migrations: `sequelize db:migrate`
    // For development/testing, `sequelize.sync()` can be useful
    // sequelize.sync({ alter: true }) // Use `alter: true` with caution in production
    //   .then(() => {
    //     logger.info('Database synced successfully');
    //   })
    //   .catch((error) => {
    //     logger.error('Failed to sync database:', error);
    //   });
  })
  .catch((error) => {
    logger.error('Unable to connect to PostgreSQL:', error);
    process.exit(1);
  });

// Connect to Redis
connectRedis()
  .then(() => {
    logger.info('Connected to Redis');
  })
  .catch((error) => {
    logger.error('Unable to connect to Redis:', error);
  });

server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} in ${config.env} mode`);
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
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
  if (server) {
    server.close();
  }
});
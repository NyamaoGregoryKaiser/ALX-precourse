const app = require('./app');
const config = require('./config/config');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const redisClient = require('./utils/redis');

let server;

// Connect to PostgreSQL and sync models
sequelize.authenticate()
  .then(() => {
    logger.info('Connected to PostgreSQL database!');
    // In production, migrations should be handled externally or via `sequelize-cli db:migrate`
    // For development/testing, `sync` can be useful. Be careful with `alter: true` in production.
    // sequelize.sync({ alter: true })
    //   .then(() => logger.info('Database synchronized!'))
    //   .catch((err) => logger.error('Error syncing database:', err));
  })
  .catch((err) => {
    logger.error('Unable to connect to the database:', err);
    process.exit(1);
  });

// Connect to Redis
redisClient.connect()
  .then(() => logger.info('Connected to Redis!'))
  .catch((err) => logger.error('Could not connect to Redis:', err));

server = app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
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
  logger.error('Unhandled error:', error);
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
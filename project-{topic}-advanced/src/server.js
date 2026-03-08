```javascript
const app = require('./app');
const config = require('../config/config');
const logger = require('./utils/logger');
const db = require('../models');
const redisClient = require('./config/database').redisClient;

let server;

// Connect to PostgreSQL and sync models
db.sequelize.authenticate()
  .then(() => {
    logger.info('Connected to PostgreSQL database successfully.');
    // In production, migrations should be handled externally or carefully.
    // For development/testing, sync can be useful:
    // return db.sequelize.sync({ force: false });
  })
  .then(() => {
    logger.info('PostgreSQL models synchronized.');
    // Connect to Redis
    return redisClient.connect();
  })
  .then(() => {
    logger.info('Connected to Redis successfully.');
    // Start the server
    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} in ${config.env} mode.`);
    });
  })
  .catch(err => {
    logger.error('Database or Redis connection error:', err);
    process.exit(1);
  });

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed.');
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
```
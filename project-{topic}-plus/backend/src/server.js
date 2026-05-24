```javascript
const app = require('./app');
const { config } = require('./config/config');
const logger = require('./utils/logger');
const db = require('./models'); // Ensure database connection is established

let server;

// Connect to database (handled in models/index.js)
// Then start the server
db.sequelize.authenticate()
  .then(() => {
    logger.info('Database synchronized and connected.');
    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
      logger.info(`Access API at: http://localhost:${config.port}${config.apiPrefix}`);
      logger.info(`Access API docs at: http://localhost:${config.port}/docs`);
    });
  })
  .catch((err) => {
    logger.error('Database connection failed!', err);
    process.exit(1);
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
```
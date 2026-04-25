```javascript
require('dotenv').config();
const app = require('./app');
const sequelize = require('./db/models').sequelize;
const logger = require('./utils/logger');
const config = require('./config/config');
const redisClient = require('./utils/cache').client;

const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Apply migrations
    // In production, you might want to run this as a separate step or a CI/CD job
    // await sequelize.sync({ force: false }); // Do not use force in production!
    // await sequelize.query("SELECT 'init' FROM pg_extension WHERE extname = 'uuid-ossp'"); // Ensure uuid-ossp extension is enabled if used

    // Initialize Redis client
    await redisClient.connect();
    logger.info('Redis client connected successfully.');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start server:', error);
    process.exit(1); // Exit process with failure code
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`, err);
  // Close server & exit process
  // server.close(() => process.exit(1)); // If using http.createServer directly
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, err);
  process.exit(1);
});

startServer();
```
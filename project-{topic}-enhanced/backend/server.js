```javascript
require('dotenv').config(); // Load environment variables first
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./utils/logger');
const config = require('./config/config');
const redisClient = require('./config/redis'); // Import Redis client

const PORT = config.port || 5000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Sync database models (run migrations separately in production)
    // await sequelize.sync({ alter: true }); // Use { force: true } only for development/testing
    // logger.info('Database models synchronized.');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis client connected successfully.');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
    });
  } catch (error) {
    logger.error(`Unable to connect to the database or start server: ${error.message}`, error);
    process.exit(1); // Exit process with failure
  }
}

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`, err);
  // Close server & exit process
  // server.close(() => process.exit(1)); // If using http.Server
  process.exit(1); // For simple Express app
});
```
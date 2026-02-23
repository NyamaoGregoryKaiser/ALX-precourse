```javascript
const app = require('./app');
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const seedDB = require('./db/seed');

const PORT = config.port;
const MONGO_URI = config.mongoURI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB Atlas');
    // Seed database if in development and not already seeded
    if (config.nodeEnv === 'development') {
      seedDB();
    }
  })
  .catch(err => {
    logger.error('Could not connect to MongoDB:', err.message);
    process.exit(1); // Exit process with failure
  });

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
```
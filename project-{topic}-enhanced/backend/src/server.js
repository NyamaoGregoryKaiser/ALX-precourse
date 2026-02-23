```javascript
const app = require('./app');
const config = require('./config');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');
const seedDatabase = require('../prisma/seed'); // Import seed script

const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected successfully.');

    // Seed database on development/test environment if needed
    if (config.env === 'development' || config.env === 'test') {
        logger.info('Seeding database...');
        await seedDatabase();
        logger.info('Database seeded.');
    }


    // Start the server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode.`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err.name, err.message, err.stack);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM for graceful shutdown in Docker
    process.on('SIGTERM', () => {
      logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully.');
      server.close(() => {
        logger.info('💥 Process terminated!');
      });
    });

  } catch (err) {
    logger.error('Failed to connect to database or start server:', err);
    process.exit(1); // Exit with failure code
  }
};

startServer();
```
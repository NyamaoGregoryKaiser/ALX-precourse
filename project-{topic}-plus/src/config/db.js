```javascript
const { PrismaClient } = require('@prisma/client');
const config = require('./index');
const logger = require('./logger');

let prisma;

// Initialize PrismaClient based on environment
if (config.env === 'production') {
  prisma = new PrismaClient();
} else {
  // In development and test, use a singleton pattern for PrismaClient
  // to prevent multiple instances from being created, especially during hot-reloads
  // or test runs, which can lead to connection pool issues.
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// Custom middleware to log database queries in development
if (config.env === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

/**
 * Connects to the database using Prisma.
 * @returns {Promise<void>}
 */
async function connectDb() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully!');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1); // Exit process on database connection failure
  }
}

/**
 * Disconnects from the database using Prisma.
 * @returns {Promise<void>}
 */
async function disconnectDb() {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected.');
  } catch (error) {
    logger.error('Database disconnection failed:', error);
  }
}

module.exports = {
  prisma,
  connectDb,
  disconnectDb,
};
```
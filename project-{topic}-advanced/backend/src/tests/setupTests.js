const { sequelize } = require('../db/models');
const logger = require('../config/logger.config');

// Clear database before each test run
beforeAll(async () => {
  logger.info('Running test setup: resetting database...');
  try {
    // Drop all tables
    await sequelize.drop({ cascade: true });
    // Run migrations
    await sequelize.sync({ force: true }); // force: true will drop tables and recreate them
    // Run seeders
    await require('../db/seeders/20240726000001-initial-data').up(sequelize.queryInterface, sequelize.Sequelize);
    logger.info('Test database reset and seeded successfully.');
  } catch (error) {
    logger.error('Failed to reset and seed test database:', error);
    process.exit(1);
  }
});

// Close DB connection after all tests are done
afterAll(async () => {
  logger.info('Running test teardown: closing database connection...');
  await sequelize.close();
  logger.info('Database connection closed.');
});

// Optional: clean up database records before each test for isolation
beforeEach(async () => {
  // If you need truly isolated tests without seeds interfering,
  // you might truncate tables here or use transactions for each test.
  // For simplicity and speed with initial data, we'll rely on the global setup.
});
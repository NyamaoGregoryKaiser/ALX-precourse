```javascript
const { sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

// Global setup for Jest tests
beforeAll(async () => {
  try {
    // Ensure database connection is established
    await sequelize.authenticate();
    logger.info('Test database connection successful.');

    // Drop and re-create database for a clean state before all tests
    await sequelize.drop({ cascade: true }); // cascade ensures related tables are dropped
    await sequelize.sync({ force: true }); // force: true will drop tables and recreate them based on models
    logger.info('Test database reset and synchronized.');

    // Run seeders for initial test data
    await sequelize.seeders.run({ logging: false }); // Assuming seeders are registered in models/index.js or run via sequelize-cli
    logger.info('Test database seeded.');
  } catch (error) {
    logger.error('Error during test setup:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  // Close database connection after all tests are done
  await sequelize.close();
  logger.info('Test database connection closed.');
});

// For individual test files, you might want beforeEach/afterEach for transactional tests.
// For simplicity in this example, we rely on the global setup to clean the database once.
```
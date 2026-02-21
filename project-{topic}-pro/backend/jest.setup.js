// jest.setup.js
const { sequelize } = require('./src/db/sequelize');
const logger = require('./src/utils/logger'); // Import logger

// Mock logger in test environment to prevent excessive console output
logger.silent = true;

beforeAll(async () => {
  // Ensure database is clean for tests
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync({ force: true }); // Drop and recreate tables for tests
  } else {
    // Prevent running this on non-test environments accidentally
    throw new Error('Tests must run with NODE_ENV=test');
  }
});

afterAll(async () => {
  await sequelize.close();
});
```javascript
const { sequelize } = require('../../models');
const config = require('../../config/config');
const logger = require('../../src/utils/logger');

describe('Database Connection', () => {
  beforeAll(async () => {
    // Ensure test environment config is loaded
    process.env.NODE_ENV = 'test';
    // Re-initialize config after setting NODE_ENV
    jest.resetModules();
    const testConfig = require('../../config/config');
    // Ensure database connection is closed before running tests
    if (sequelize.options.host !== testConfig.db.host || sequelize.options.database !== testConfig.db.database) {
      // If sequelize was already initialized with dev config, close it.
      // In a real setup, make sure your test runner truly isolates envs.
      logger.warn('Sequelize instance might be using dev config, attempting to re-init for test.');
      await sequelize.close();
    }
  });

  test('should connect to the PostgreSQL database successfully in test environment', async () => {
    // Test database connection
    try {
      await sequelize.authenticate();
      logger.info('Integration Test: Successfully connected to test PostgreSQL database.');
      expect(true).toBe(true); // If no error, connection is successful
    } catch (error) {
      logger.error('Integration Test: Failed to connect to test PostgreSQL database.', error);
      fail('Failed to connect to test PostgreSQL database: ' + error.message);
    }
  });

  test('should have a clean database before running tests', async () => {
    // Check if tables are empty or setup correctly for tests
    const usersCount = await sequelize.models.User.count();
    const accountsCount = await sequelize.models.Account.count();
    const transactionsCount = await sequelize.models.Transaction.count();

    // After running npm run db:setup in CI, we expect some seed data
    expect(usersCount).toBeGreaterThanOrEqual(2); // Admin + John Doe
    expect(accountsCount).toBeGreaterThanOrEqual(4); // 2 for admin, 2 for John Doe
    expect(transactionsCount).toBeGreaterThanOrEqual(1); // One example transaction
  });
});
```
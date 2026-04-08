// setup.js for Jest
const sequelize = require('../src/config/database');
const { clearCache } = require('../src/middleware/cache'); // Import clearCache

// Before all tests, ensure the test database is clean and migrated
beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must be run in test environment. NODE_ENV is not set to "test".');
  }

  // Clear existing data and run migrations
  await sequelize.sync({ force: true }); // DANGER: This drops all tables! Only use for test env.
  await sequelize.query('SET session_replication_role = \'replica\';'); // Temporarily disable foreign key checks for clearing
  await sequelize.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;');
  await sequelize.query('TRUNCATE TABLE "products" RESTART IDENTITY CASCADE;');
  await sequelize.query('SET session_replication_role = \'origin\';'); // Re-enable foreign key checks

  // Run seeders for initial data
  const seeders = require('sequelize-cli/lib/seeders');
  const path = require('path');
  const umzug = new seeders.Umzug({
    storage: 'sequelize',
    storageOptions: { sequelize: sequelize },
    migrations: {
      params: [sequelize.getQueryInterface(), sequelize.constructor],
      path: path.join(__dirname, '../src/seeders'),
      pattern: /\.js$/,
    },
    logging: false,
  });
  await umzug.up();
  console.log('Test database seeded.');

  // Clear any cache from previous test runs if needed
  await clearCache('*');
});

// After all tests, close the database connection
afterAll(async () => {
  await sequelize.close();
  await require('../src/config/redis').disconnect(); // Disconnect Redis
});

// After each test, you might want to clear some specific data or reset state
afterEach(async () => {
  // Clear any cache that might interfere with subsequent tests
  await clearCache('*');
});
```
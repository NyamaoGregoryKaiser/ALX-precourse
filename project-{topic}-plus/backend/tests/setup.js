```javascript
// This file runs before each test suite

// Load environment variables for testing
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' }); // Ensure test-specific env vars are loaded
require('dotenv').config({ path: '.env' }); // Fallback to general .env

const db = require('../src/database'); // Import your database connection
const { sequelize } = db;

// Global beforeEach to clear and re-seed the database for isolation
beforeAll(async () => {
  console.log('--- Test Setup: Connecting to DB & Migrating ---');
  await sequelize.authenticate();
  // Drop all tables, then run migrations to ensure a clean state
  await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await sequelize.sync({ force: true }); // Force sync creates tables based on models
  console.log('--- Test Setup: Database Migrated & Synced ---');

  // Run seeders for initial data
  // Note: Sequelize CLI seeders are designed for CLI. For programmatic, you might
  // need to manually call the functions or use a helper.
  // For simplicity, we'll manually insert some data.
  // In a complex app, you might abstract this into a test-seeder utility.
  const { up: seedUp } = require('../src/database/seeders/YYYYMMDDHHMMSS-initial-data'); // Adjust path and name
  await seedUp(sequelize.queryInterface, sequelize.Sequelize);
  console.log('--- Test Setup: Database Seeded ---');
});

afterAll(async () => {
  console.log('--- Test Teardown: Clearing DB & Closing Connection ---');
  // Clean up database after all tests (optional, sometimes good to inspect)
  // await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await sequelize.close();
  console.log('--- Test Teardown: DB Connection Closed ---');
});
```
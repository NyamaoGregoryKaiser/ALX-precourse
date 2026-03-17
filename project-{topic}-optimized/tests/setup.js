const knex = require('knex');
const knexConfig = require('../knexfile');
const config = require('../src/config');
const { connectRedis, disconnectRedis } = require('../src/utils/cache');

// Initialize Knex for the test environment
const db = knex(knexConfig.test);

// Make DB instance available globally for tests
global.db = db;

// Before all tests, ensure the test database is clean, migrated, and seeded
beforeAll(async () => {
  console.log('--- Setting up test environment ---');
  // Disconnect Redis in test environment as we're not actively testing it, or mock it.
  // For simplicity, we'll ensure it's not trying to connect by checking config.env
  // in cache.js and manually disconnecting if it somehow connected.
  if (config.env === 'test' && global.cacheClient && global.cacheClient.isOpen) {
    await disconnectRedis();
  }

  // Drop tables in case they exist from a previous failed run
  await db.schema.dropTableIfExists('transactions');
  await db.schema.dropTableIfExists('accounts');
  await db.schema.dropTableIfExists('users');
  await db.schema.dropTableIfExists('knex_test_migrations'); // Clean up migration table

  // Run migrations
  await db.migrate.latest({
    directory: './src/db/migrations',
    tableName: 'knex_test_migrations',
  });

  // Run seeds
  await db.seed.run({
    directory: './src/db/seeds',
  });

  console.log('--- Test environment setup complete ---');
}, 30000); // Increased timeout for migrations/seeds

// After each test, you might want to reset the database state
// For now, we'll just ensure connections are managed.
// For faster tests, consider using transactions per test case and rolling them back.
afterEach(async () => {
  // Invalidate any cache entries that might have been set during the test
  // For actual Redis integration testing, you'd flush the Redis DB.
  // For this setup, we assume Redis is mocked or not deeply tested.
});

// After all tests, destroy the database connection
afterAll(async () => {
  console.log('--- Tearing down test environment ---');
  await db.destroy();
  if (global.cacheClient && global.cacheClient.isOpen) {
    await disconnectRedis();
  }
  console.log('--- Test environment teardown complete ---');
});
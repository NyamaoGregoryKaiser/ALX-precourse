const db = require('../database/connection'); // Ensure connection is established
const logger = require('../utils/logger');
const knexfile = require('../../knexfile');
const config = require('../config');

// Set the database URL for tests to a dedicated test database
process.env.DATABASE_URL = knexfile.test.connection;

beforeAll(async () => {
  logger.silent = true; // Silence logger during tests
  console.log('Running migrations and seeds for test database...');
  try {
    // Drop existing tables, run migrations and seeds for a clean test environment
    await db.migrate.rollback(null, true); // Rollback all migrations
    await db.migrate.latest(); // Run latest migrations
    await db.seed.run(); // Run seeds
    console.log('Test database setup complete.');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  logger.silent = false; // Re-enable logger after tests
  console.log('Rolling back migrations for test database...');
  try {
    await db.migrate.rollback(null, true); // Rollback all migrations
    await db.destroy(); // Close the database connection
    console.log('Test database tear down complete.');
  } catch (error) {
    console.error('Failed to tear down test database:', error);
    process.exit(1);
  }
});
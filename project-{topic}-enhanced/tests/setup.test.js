```javascript
const { sequelize } = require('../db/models');
const config = require('../config/config');
const cache = require('../utils/cache');
const app = require('../app'); // Import your express app for server setup
const http = require('http');

let server;

beforeAll(async () => {
  // Set NODE_ENV to test for test-specific configurations
  process.env.NODE_ENV = 'test';

  // Ensure Redis client is disconnected before starting tests
  if (cache.client && cache.client.status !== 'end') {
    await cache.client.quit();
  }

  // Connect to the test database
  await sequelize.authenticate();
  console.log('Test database connected.');

  // Drop and recreate tables, then seed data for a clean test environment
  // In CI, these commands are run before `npm test`. Locally, you might need to run them manually or via a script.
  // await sequelize.sync({ force: true });
  // await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'); // Ensure uuid-ossp for UUID generation
  // await sequelize.getQueryInterface().bulkInsert('users', [
  //   // ... test data ...
  // ]);
  // await sequelize.getQueryInterface().bulkInsert('products', [
  //   // ... test data ...
  // ]);

  // Start Redis for tests
  await cache.client.connect();
  console.log('Test Redis connected.');

  // Start the server for API tests
  server = http.createServer(app);
  server.listen(config.port, () => {
    console.log(`Test server running on port ${config.port}`);
  });
});

afterAll(async () => {
  // Clean up database after all tests
  // await sequelize.drop(); // Only if you want to completely clear the schema
  // We recommend using db:migrate:undo and db:migrate in CI/CD before tests and after.
  // Locally, if you ran `sequelize db:reset --env test` before tests, you don't need to drop.

  // Disconnect from database
  await sequelize.close();
  console.log('Test database disconnected.');

  // Disconnect from Redis
  if (cache.client && cache.client.status !== 'end') {
    await cache.client.quit();
  }
  console.log('Test Redis disconnected.');

  // Close the server
  if (server) {
    await new Promise(resolve => server.close(resolve));
    console.log('Test server closed.');
  }
});

// Optional: Clear Redis cache and specific table data before each test if needed
beforeEach(async () => {
  if (cache.client && cache.client.status === 'ready') {
    await cache.client.flushdb();
  }
  // If you need specific data states for each test, you can reset tables here.
  // For now, `db:reset` before `npm test` provides a clean slate.
});
```
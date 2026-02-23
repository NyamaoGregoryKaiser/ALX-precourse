```javascript
// This file can be used for global test setup, e.g., connecting to an in-memory database
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../src/config');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const seedDB = require('../src/db/seed'); // Re-use seed for tests

let mongoServer;

// Before all tests, start the in-memory MongoDB server and connect Mongoose
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Before each test, clear the database and re-seed it
beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  // Instead of re-running the full seed, you might want a simpler mock data for unit tests,
  // but for integration/API tests, a fresh seeded state is often good.
  // For simplicity, we'll use the main seed function.
  // The seedDB function expects to disconnect, so we need to re-connect after it.
  const uri = mongoServer.getUri(); // Re-get URI as it might be needed by seedDB
  await mongoose.disconnect(); // Disconnect to allow seedDB to connect
  // Temporarily override process.exit to prevent seedDB from exiting the test runner
  const originalExit = process.exit;
  process.exit = (code) => {
    if (code !== 0) { // Only exit if it's an error code
        throw new Error(`seedDB tried to exit with code ${code}`);
    }
    // Otherwise, do nothing for successful exit (this allows subsequent code to run)
  };
  try {
    await seedDB();
  } catch (error) {
    console.error('Seed DB failed during beforeEach:', error);
    // If seedDB throws an error, we should re-throw to fail the test.
    throw error;
  } finally {
    process.exit = originalExit; // Restore original process.exit
    // Reconnect after seeding
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

// After all tests, disconnect Mongoose and stop the in-memory MongoDB server
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```
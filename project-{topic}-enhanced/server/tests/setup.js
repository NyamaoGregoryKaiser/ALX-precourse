const { sequelize } = require('../src/models');
const config = require('../src/config/config');
const redisClient = require('../src/utils/redis');
const logger = require('../src/utils/logger'); // Import logger for tests

beforeAll(async () => {
  logger.level = 'error'; // Suppress logging during tests
  // Ensure Redis client is connected before tests run
  if (!redisClient.isReady) {
    await redisClient.connect();
  }
  // Clear Redis before tests
  await redisClient.flushdb();

  // Recreate the test database and run migrations/seeders
  if (config.env === 'test') {
    // Drop all tables
    await sequelize.drop({ cascade: true }); // Careful with cascade in real environments!
    // Recreate tables based on models
    await sequelize.sync();
    // Run seeders if any
    // This assumes you have seeders in a format compatible with `sequelize.sync` or run manually
    // For proper seeder usage: require('../src/seeders/YOUR_SEEDER_FILE').up(sequelize.getQueryInterface(), sequelize.Sequelize);
    // For now, let's manually add an admin user
    const { User } = require('../src/models');
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    const hashedPassword = await bcrypt.hash('password123', 8);
    await User.create({
      id: uuidv4(),
      firstName: 'Test',
      lastName: 'Admin',
      email: 'testadmin@example.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
});

afterAll(async () => {
  if (config.env === 'test') {
    await sequelize.close();
  }
  // Disconnect Redis
  if (redisClient.isReady) {
    await redisClient.quit();
  }
});
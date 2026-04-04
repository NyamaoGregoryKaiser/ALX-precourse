```javascript
const { prisma } = require('../../src/config/db');
const bcrypt = require('bcryptjs');

/**
 * Creates a test user in the database.
 * @param {object} overrides - Optional properties to override default user data.
 * @returns {Promise<object>} The created user object.
 */
const createTestUser = async (overrides = {}) => {
  const password = overrides.password || 'Test1234!';
  const hashedPassword = await bcrypt.hash(password, 12);

  const userData = {
    username: overrides.username || `testuser${Date.now()}`,
    email: overrides.email || `test${Date.now()}@example.com`,
    password: hashedPassword,
    role: overrides.role || 'USER',
  };

  return prisma.user.create({
    data: userData,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Deletes all users, categories, and tasks from the database.
 */
const clearDatabase = async () => {
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};

module.exports = {
  createTestUser,
  clearDatabase,
};
```
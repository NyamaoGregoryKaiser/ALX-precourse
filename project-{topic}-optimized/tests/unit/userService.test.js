// Note: For true unit tests, you'd mock the `db` dependency.
// This example combines some unit-like logic with direct DB interaction for simplicity,
// but a strict unit test would isolate `userService` from `knex`.

// We're using the global `db` setup in `tests/setup.js`
const userService = require('../../src/services/userService');
const { ApiError } = require('../../src/middleware/errorHandler');
const bcrypt = require('bcryptjs');

// Mock cache for unit tests, so we don't need a running Redis
jest.mock('../../src/utils/cache', () => ({
  setCache: jest.fn(),
  getCache: jest.fn(() => null), // Always return null to force DB fetch
  deleteCache: jest.fn(),
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

describe('UserService Unit Tests', () => {
  let testUser;

  // Before each test, ensure a clean user state or fetch existing ones
  beforeEach(async () => {
    // Clean up specific test users created by tests to avoid conflicts
    await global.db('users').where('email', 'testuser@example.com').del();
    await global.db('users').where('email', 'updated@example.com').del();

    // Re-seed a specific user for consistent testing
    const hashedPassword = await bcrypt.hash('password123', 10);
    const [user] = await global.db('users').insert({
      username: 'Test User',
      email: 'testuser@example.com',
      password: hashedPassword,
      role: 'user',
    }).returning('*');
    testUser = user;
  });

  afterEach(async () => {
    // Clear mocks after each test
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    test('should return a user if found', async () => {
      const user = await userService.getUserById(testUser.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe('testuser@example.com');
      expect(user).not.toHaveProperty('password'); // Password should not be returned
    });

    test('should throw ApiError 404 if user not found', async () => {
      const nonExistentId = '12345678-1234-4234-8234-123456789012'; // Invalid UUID
      await expect(userService.getUserById(nonExistentId)).rejects.toThrow(ApiError);
      await expect(userService.getUserById(nonExistentId)).rejects.toHaveProperty('statusCode', 404);
    });
  });

  describe('updateUser', () => {
    test('should update user username and invalidate cache', async () => {
      const updateData = { username: 'Updated User Name' };
      const updatedUser = await userService.updateUser(testUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.username).toBe('Updated User Name');
      expect(updatedUser.id).toBe(testUser.id);
      expect(updatedUser.updated_at).not.toBe(testUser.updated_at);
      expect(require('../../src/utils/cache').deleteCache).toHaveBeenCalledWith(`user:${testUser.id}`);

      // Verify update in DB
      const dbUser = await global.db('users').where({ id: testUser.id }).first();
      expect(dbUser.username).toBe('Updated User Name');
    });

    test('should update user password and invalidate cache', async () => {
      const newPassword = 'newStrongPassword';
      const updateData = { password: newPassword };
      const updatedUser = await userService.updateUser(testUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(testUser.id);
      expect(require('../../src/utils/cache').deleteCache).toHaveBeenCalledWith(`user:${testUser.id}`);

      // Verify password update in DB (by comparing hashed passwords)
      const dbUser = await global.db('users').where({ id: testUser.id }).first();
      const isPasswordMatch = await bcrypt.compare(newPassword, dbUser.password);
      expect(isPasswordMatch).toBe(true);
    });

    test('should throw ApiError 404 if user not found', async () => {
      const nonExistentId = '12345678-1234-4234-8234-123456789012';
      await expect(userService.updateUser(nonExistentId, { username: 'Nope' }))
        .rejects.toThrow(ApiError);
      await expect(userService.updateUser(nonExistentId, { username: 'Nope' }))
        .rejects.toHaveProperty('statusCode', 404);
    });

    test('should throw ApiError 400 for invalid update data', async () => {
      await expect(userService.updateUser(testUser.id, { username: 's' })) // Too short
        .rejects.toThrow(ApiError);
      await expect(userService.updateUser(testUser.id, { invalidField: 'value' })) // No valid fields
        .rejects.toThrow(ApiError);
    });
  });

  describe('deleteUser', () => {
    test('should delete a user and invalidate cache', async () => {
      const message = await userService.deleteUser(testUser.id);
      expect(message).toBe('User deleted successfully.');
      expect(require('../../src/utils/cache').deleteCache).toHaveBeenCalledWith(`user:${testUser.id}`);

      // Verify deletion in DB
      const deletedUser = await global.db('users').where({ id: testUser.id }).first();
      expect(deletedUser).toBeUndefined();
    });

    test('should throw ApiError 404 if user not found', async () => {
      const nonExistentId = '12345678-1234-4234-8234-123456789012';
      await expect(userService.deleteUser(nonExistentId)).rejects.toThrow(ApiError);
      await expect(userService.deleteUser(nonExistentId)).rejects.toHaveProperty('statusCode', 404);
    });
  });
});
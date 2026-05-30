const httpStatus = require('http-status');
const { User } = require('../../../src/models');
const userService = require('../../../src/services/user.service');
const ApiError = require('../../../src/utils/ApiError');
const { v4: uuidv4 } = require('uuid');

describe('User Service', () => {
  let newUser;

  beforeEach(() => {
    newUser = {
      id: uuidv4(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      role: 'member',
    };
  });

  afterEach(async () => {
    // Clean up created users after each test
    await User.destroy({ where: { email: newUser.email }, force: true });
    await User.destroy({ where: { email: 'updated.john@example.com' }, force: true });
  });

  describe('createUser', () => {
    test('should return a user if email is not taken', async () => {
      const user = await userService.createUser(newUser);
      expect(user).toBeDefined();
      expect(user.email).toBe(newUser.email);
      expect(user.password).not.toBe(newUser.password); // Password should be hashed
    });

    test('should throw an error if email is already taken', async () => {
      await userService.createUser(newUser); // Create user once
      await expect(userService.createUser(newUser)).rejects.toThrow(ApiError);
      await expect(userService.createUser(newUser)).rejects.toHaveProperty('statusCode', httpStatus.BAD_REQUEST);
    });
  });

  describe('queryUsers', () => {
    test('should return all users without filters', async () => {
      await userService.createUser({ ...newUser, email: 'user1@example.com' });
      await userService.createUser({ ...newUser, email: 'user2@example.com' });

      const result = await userService.queryUsers({}, {});
      expect(result.results.length).toBeGreaterThanOrEqual(2); // Accounts for admin user from setup
      expect(result.totalResults).toBeGreaterThanOrEqual(2);
      expect(result.results[0].password).toBeUndefined(); // Password should be excluded
    });

    test('should filter users by email', async () => {
      await userService.createUser({ ...newUser, email: 'filtertest@example.com' });
      const result = await userService.queryUsers({ email: 'filtertest@example.com' }, {});
      expect(result.results).toHaveLength(1);
      expect(result.results[0].email).toBe('filtertest@example.com');
    });
  });

  describe('getUserById', () => {
    test('should return a user if id is found', async () => {
      const user = await userService.createUser(newUser);
      const fetchedUser = await userService.getUserById(user.id);
      expect(fetchedUser).toBeDefined();
      expect(fetchedUser.id).toBe(user.id);
      expect(fetchedUser.password).toBeUndefined();
    });

    test('should return null if user not found', async () => {
      const fetchedUser = await userService.getUserById(uuidv4());
      expect(fetchedUser).toBeNull();
    });
  });

  describe('updateUserById', () => {
    test('should update user if id is found', async () => {
      const user = await userService.createUser(newUser);
      const updateBody = { email: 'updated.john@example.com', firstName: 'Johnny' };
      const updatedUser = await userService.updateUserById(user.id, updateBody);

      expect(updatedUser.email).toBe(updateBody.email);
      expect(updatedUser.firstName).toBe(updateBody.firstName);
      const fetchedUser = await userService.getUserById(user.id);
      expect(fetchedUser.email).toBe(updateBody.email);
    });

    test('should throw error if update to an already taken email', async () => {
      await userService.createUser(newUser); // user1
      const user2 = await userService.createUser({ ...newUser, email: 'another@example.com' }); // user2
      const updateBody = { email: newUser.email };
      await expect(userService.updateUserById(user2.id, updateBody)).rejects.toThrow(ApiError);
      await expect(userService.updateUserById(user2.id, updateBody)).rejects.toHaveProperty('statusCode', httpStatus.BAD_REQUEST);
    });

    test('should throw error if user not found for update', async () => {
      const updateBody = { email: 'nonexistent@example.com' };
      await expect(userService.updateUserById(uuidv4(), updateBody)).rejects.toThrow(ApiError);
      await expect(userService.updateUserById(uuidv4(), updateBody)).rejects.toHaveProperty('statusCode', httpStatus.NOT_FOUND);
    });
  });

  describe('deleteUserById', () => {
    test('should delete user if id is found', async () => {
      const user = await userService.createUser(newUser);
      await userService.deleteUserById(user.id);
      const fetchedUser = await userService.getUserById(user.id);
      expect(fetchedUser).toBeNull();
    });

    test('should throw error if user not found for deletion', async () => {
      await expect(userService.deleteUserById(uuidv4())).rejects.toThrow(ApiError);
      await expect(userService.deleteUserById(uuidv4())).rejects.toHaveProperty('statusCode', httpStatus.NOT_FOUND);
    });
  });
});
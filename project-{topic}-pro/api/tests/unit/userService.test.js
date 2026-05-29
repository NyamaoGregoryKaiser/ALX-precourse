```javascript
const httpStatus = require('http-status');
const { userService } = require('../../src/services');
const { User } = require('../../src/models');
const ApiError = require('../../src/utils/ApiError');
const { ROLES } = require('../../src/config/constants');
const { sequelize } = require('../../src/config/db');

// Mock User model for isolated unit testing
jest.mock('../../src/models/User', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
  destroy: jest.fn(),
  // Mock User instance methods
  prototype: {
    save: jest.fn(function () { return Promise.resolve(this); }),
    isPasswordMatch: jest.fn(() => true), // Mock password match for login tests
    toJSON: jest.fn(function () { return { ...this.dataValues, password: '***' }; }), // Mock toJSON to hide password
  },
}));

describe('userService', () => {
  let newUser;

  beforeAll(async () => {
    // Before all tests, clear all mocks
    jest.clearAllMocks();
    // Setup a mock user object to be used across tests
    newUser = {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123!',
      role: ROLES.USER,
      isEmailVerified: false,
    };
  });

  afterEach(() => {
    // Clear mocks after each test to ensure isolation
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('should return a user if email is not taken', async () => {
      User.findOne.mockResolvedValue(null); // No existing user
      User.create.mockResolvedValue(newUser);

      const createdUser = await userService.createUser(newUser);
      expect(createdUser).toEqual(newUser);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: newUser.email } });
      expect(User.create).toHaveBeenCalledWith(newUser);
    });

    test('should throw ApiError if email is already taken', async () => {
      User.findOne.mockResolvedValue(newUser); // Email already exists

      await expect(userService.createUser(newUser)).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, 'Email already taken')
      );
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: newUser.email } });
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('queryUsers', () => {
    test('should return paginated users', async () => {
      const usersData = {
        count: 2,
        rows: [
          { ...newUser, id: '1' },
          { ...newUser, id: '2', email: 'test2@example.com' },
        ],
      };
      User.findAndCountAll.mockResolvedValue(usersData);

      const result = await userService.queryUsers({}, { limit: 1, page: 1, sortBy: 'createdAt:desc' });
      expect(result).toEqual({
        results: usersData.rows,
        totalResults: usersData.count,
        page: 1,
        limit: 1,
        totalPages: 2,
      });
      expect(User.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 1,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
    });

    test('should apply filters and sorting', async () => {
      const filter = { email: 'test@example.com' };
      const options = { limit: 10, page: 1, sortBy: 'email:asc' };
      User.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ ...newUser }] });

      await userService.queryUsers(filter, options);
      expect(User.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { email: 'test@example.com' },
        order: [['email', 'ASC']],
        limit: 10,
        offset: 0,
      }));
    });
  });

  describe('getUserById', () => {
    test('should return a user if found', async () => {
      User.findByPk.mockResolvedValue(newUser);
      const user = await userService.getUserById(newUser.id);
      expect(user).toEqual(newUser);
      expect(User.findByPk).toHaveBeenCalledWith(newUser.id);
    });

    test('should return null if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      const user = await userService.getUserById('nonexistent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    test('should return a user if found by email', async () => {
      User.findOne.mockResolvedValue(newUser);
      const user = await userService.getUserByEmail(newUser.email);
      expect(user).toEqual(newUser);
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: newUser.email } });
    });

    test('should return null if user not found by email', async () => {
      User.findOne.mockResolvedValue(null);
      const user = await userService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('updateUserById', () => {
    test('should update a user if found and email not taken', async () => {
      const userToUpdate = { ...newUser };
      const updatedBody = { firstName: 'Updated', email: 'updated@example.com' };
      const updatedUser = { ...userToUpdate, ...updatedBody };

      User.findByPk.mockResolvedValue({
        ...userToUpdate,
        save: jest.fn().mockResolvedValue(updatedUser), // Mock the save method of the instance
        // isPasswordMatch: jest.fn(() => true), // Ensure existing mock or add here
      });
      User.findOne.mockResolvedValue(null); // Ensure updated email is not taken

      const result = await userService.updateUserById(userToUpdate.id, updatedBody);
      expect(result).toEqual(updatedUser);
      expect(User.findByPk).toHaveBeenCalledWith(userToUpdate.id);
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: updatedBody.email, id: { [require('sequelize').Op.ne]: userToUpdate.id } },
      });
      expect(result.save).toHaveBeenCalled();
    });

    test('should throw ApiError if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      await expect(userService.updateUserById('nonexistent-id', { firstName: 'Updated' })).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, 'User not found')
      );
    });

    test('should throw ApiError if new email is already taken by another user', async () => {
      const existingUserWithEmail = { ...newUser, id: 'different-id' };
      User.findByPk.mockResolvedValue({ ...newUser, id: 'target-id', save: jest.fn() });
      User.findOne.mockResolvedValue(existingUserWithEmail); // Another user has this email

      await expect(userService.updateUserById('target-id', { email: existingUserWithEmail.email })).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, 'Email already taken')
      );
    });
  });

  describe('deleteUserById', () => {
    test('should delete a user if found', async () => {
      const userToDelete = { ...newUser, destroy: jest.fn().mockResolvedValue(true) };
      User.findByPk.mockResolvedValue(userToDelete);

      const result = await userService.deleteUserById(userToDelete.id);
      expect(result).toEqual(userToDelete);
      expect(User.findByPk).toHaveBeenCalledWith(userToDelete.id);
      expect(userToDelete.destroy).toHaveBeenCalled();
    });

    test('should throw ApiError if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      await expect(userService.deleteUserById('nonexistent-id')).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, 'User not found')
      );
    });
  });
});
```
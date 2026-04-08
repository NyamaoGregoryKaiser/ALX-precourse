const userService = require('../../src/services/userService');
const sequelize = require('../../src/config/database');
const User = require('../../src/models/User')(sequelize, require('sequelize'));
const { NotFoundError, APIError } = require('../../src/utils/errors');

// Mock User model
jest.mock('../../src/models/User', () => {
  const SequelizeMock = require('sequelize-mock');
  const DB = new SequelizeMock();
  const UserMock = DB.define('User', {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }, {
    tableName: 'users',
    timestamps: true,
  });
  UserMock.findByPk = jest.fn();
  UserMock.findAndCountAll = jest.fn();
  UserMock.destroy = jest.fn();
  UserMock.prototype.update = jest.fn(); // Mock instance update method
  return jest.fn(() => UserMock); // Return a function that returns the mock model
});

describe('UserService Unit Tests', () => {
  let UserMock;

  beforeAll(() => {
    UserMock = User(); // Get the mocked User model instance
  });

  beforeEach(() => {
    // Reset mocks before each test
    UserMock.findByPk.mockReset();
    UserMock.findAndCountAll.mockReset();
    UserMock.destroy.mockReset();
    UserMock.prototype.update.mockReset();
  });

  describe('getAllUsers', () => {
    it('should return a list of users with pagination', async () => {
      const mockUsers = [{ id: 1, username: 'user1', email: 'user1@test.com', role: 'user' }];
      UserMock.findAndCountAll.mockResolvedValueOnce({
        count: 1,
        rows: mockUsers,
      });

      const { users, total } = await userService.getAllUsers(1, 10);

      expect(UserMock.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
      }));
      expect(users).toEqual(mockUsers);
      expect(total).toBe(1);
    });

    it('should throw APIError if fetching users fails', async () => {
      UserMock.findAndCountAll.mockRejectedValueOnce(new Error('DB error'));

      await expect(userService.getAllUsers(1, 10)).rejects.toThrow(APIError);
    });
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };
      UserMock.findByPk.mockResolvedValueOnce(mockUser);

      const user = await userService.getUserById(1);

      expect(UserMock.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(user).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      UserMock.findByPk.mockResolvedValueOnce(null);

      const user = await userService.getUserById(99);

      expect(user).toBeNull();
    });

    it('should throw APIError if fetching user fails', async () => {
      UserMock.findByPk.mockRejectedValueOnce(new Error('DB error'));

      await expect(userService.getUserById(1)).rejects.toThrow(APIError);
    });
  });

  describe('updateUser', () => {
    it('should successfully update an existing user', async () => {
      const mockUserInstance = {
        id: 1,
        username: 'oldusername',
        email: 'old@example.com',
        role: 'user',
        update: UserMock.prototype.update,
      };
      const updatedData = { username: 'newusername', email: 'new@example.com' };
      const mockUpdatedUser = { ...mockUserInstance, ...updatedData };

      UserMock.findByPk.mockResolvedValueOnce(mockUserInstance); // For finding
      UserMock.prototype.update.mockResolvedValueOnce(mockUpdatedUser); // For instance update
      UserMock.findByPk.mockResolvedValueOnce(mockUpdatedUser); // For fetching updated

      const user = await userService.updateUser(1, updatedData);

      expect(UserMock.findByPk).toHaveBeenCalledWith(1); // First call to find user
      expect(mockUserInstance.update).toHaveBeenCalledWith(updatedData);
      expect(UserMock.findByPk).toHaveBeenCalledWith(1, expect.any(Object)); // Second call to fetch updated
      expect(user).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundError if user to update is not found', async () => {
      UserMock.findByPk.mockResolvedValueOnce(null);

      await expect(userService.updateUser(99, { username: 'New Name' })).rejects.toThrow(NotFoundError);
    });

    it('should throw APIError if update operation fails', async () => {
      const mockUserInstance = { id: 1, update: UserMock.prototype.update };
      UserMock.findByPk.mockResolvedValueOnce(mockUserInstance);
      UserMock.prototype.update.mockRejectedValueOnce(new Error('DB error'));

      await expect(userService.updateUser(1, { username: 'New Name' })).rejects.toThrow(APIError);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user', async () => {
      const mockUserInstance = { id: 1, destroy: jest.fn().mockResolvedValue(true) };
      UserMock.findByPk.mockResolvedValueOnce(mockUserInstance);

      const result = await userService.deleteUser(1);

      expect(UserMock.findByPk).toHaveBeenCalledWith(1);
      expect(mockUserInstance.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if user to delete is not found', async () => {
      UserMock.findByPk.mockResolvedValueOnce(null);

      const result = await userService.deleteUser(99);

      expect(result).toBe(false);
    });

    it('should throw APIError if deletion fails', async () => {
      const mockUserInstance = { id: 1, destroy: jest.fn().mockRejectedValue(new Error('DB error')) };
      UserMock.findByPk.mockResolvedValueOnce(mockUserInstance);

      await expect(userService.deleteUser(1)).rejects.toThrow(APIError);
    });
  });
});
```
```javascript
const { User } = require('../../db/models');
const userService = require('../../services/userService');
const cache = require('../../utils/cache');
const { AppError } = require('../../utils/errorHandler');

jest.mock('../../db/models', () => ({
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
}));
jest.mock('../../utils/cache');

describe('User Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUsers = [
    { id: '1', username: 'user1', email: 'user1@example.com', role: 'user' },
    { id: '2', username: 'admin1', email: 'admin1@example.com', role: 'admin' },
  ];
  const mockUser = { id: '1', username: 'user1', email: 'user1@example.com', role: 'user', update: jest.fn() };

  describe('findAllUsers', () => {
    it('should return all users from cache if available', async () => {
      cache.get.mockResolvedValue(JSON.stringify(mockUsers));
      const users = await userService.findAllUsers();
      expect(users).toEqual(mockUsers);
      expect(cache.get).toHaveBeenCalledWith('all_users');
      expect(User.findAll).not.toHaveBeenCalled();
    });

    it('should return all users from DB and cache if not in cache', async () => {
      cache.get.mockResolvedValue(null);
      User.findAll.mockResolvedValue(mockUsers);
      cache.set.mockResolvedValue('OK');

      const users = await userService.findAllUsers();
      expect(users).toEqual(mockUsers);
      expect(cache.get).toHaveBeenCalledWith('all_users');
      expect(User.findAll).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith('all_users', JSON.stringify(mockUsers), 300);
    });

    it('should throw AppError if database operation fails', async () => {
      cache.get.mockResolvedValue(null);
      const dbError = new Error('DB connection failed');
      User.findAll.mockRejectedValue(dbError);

      await expect(userService.findAllUsers()).rejects.toThrow(
        new AppError('Could not retrieve users.', 500)
      );
    });
  });

  describe('findUserById', () => {
    it('should return a user by ID', async () => {
      User.findByPk.mockResolvedValue(mockUser);
      const user = await userService.findUserById('1');
      expect(user).toEqual(mockUser);
      expect(User.findByPk).toHaveBeenCalledWith('1');
    });

    it('should return null if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      const user = await userService.findUserById('non-existent-id');
      expect(user).toBeNull();
    });

    it('should throw AppError if database operation fails', async () => {
      const dbError = new Error('DB error');
      User.findByPk.mockRejectedValue(dbError);
      await expect(userService.findUserById('1')).rejects.toThrow(
        new AppError('Could not retrieve user.', 500)
      );
    });
  });

  describe('createUser', () => {
    const newUserData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      role: 'user',
    };
    const createdUser = { id: '3', ...newUserData };

    it('should create a new user and invalidate cache', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(createdUser);
      cache.del.mockResolvedValue(1);

      const user = await userService.createUser(newUserData);
      expect(user).toEqual(createdUser);
      expect(User.create).toHaveBeenCalledWith(newUserData);
      expect(cache.del).toHaveBeenCalledWith('all_users');
    });

    it('should throw AppError if user with email already exists', async () => {
      User.findOne.mockResolvedValue(mockUser);
      await expect(userService.createUser(newUserData)).rejects.toThrow(
        new AppError('User with that email already exists.', 409)
      );
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should throw an error if database operation fails', async () => {
      User.findOne.mockResolvedValue(null);
      const dbError = new Error('DB error');
      User.create.mockRejectedValue(dbError);
      await expect(userService.createUser(newUserData)).rejects.toThrow(dbError);
    });
  });

  describe('updateUser', () => {
    const updateData = { username: 'updateduser' };

    it('should update a user and invalidate cache', async () => {
      mockUser.update.mockResolvedValue({ ...mockUser, ...updateData });
      User.findByPk.mockResolvedValue(mockUser);
      cache.del.mockResolvedValue(1);

      const updatedUser = await userService.updateUser('1', updateData);
      expect(updatedUser).toEqual({ ...mockUser, ...updateData });
      expect(mockUser.update).toHaveBeenCalledWith(updateData);
      expect(cache.del).toHaveBeenCalledWith('all_users');
    });

    it('should return null if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      const updatedUser = await userService.updateUser('non-existent-id', updateData);
      expect(updatedUser).toBeNull();
    });

    it('should throw an error if database operation fails', async () => {
      User.findByPk.mockResolvedValue(mockUser);
      const dbError = new Error('DB update error');
      mockUser.update.mockRejectedValue(dbError);
      await expect(userService.updateUser('1', updateData)).rejects.toThrow(dbError);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and invalidate cache', async () => {
      User.destroy.mockResolvedValue(1); // 1 row deleted
      cache.del.mockResolvedValue(1);

      const result = await userService.deleteUser('1');
      expect(result).toBe(true);
      expect(User.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(cache.del).toHaveBeenCalledWith('all_users');
    });

    it('should return false if user not found', async () => {
      User.destroy.mockResolvedValue(0); // 0 rows deleted
      const result = await userService.deleteUser('non-existent-id');
      expect(result).toBe(false);
      expect(cache.del).not.toHaveBeenCalled(); // Cache not invalidated if nothing changed
    });

    it('should throw AppError if database operation fails', async () => {
      const dbError = new Error('DB delete error');
      User.destroy.mockRejectedValue(dbError);
      await expect(userService.deleteUser('1')).rejects.toThrow(
        new AppError('Could not delete user.', 500)
      );
    });
  });
});
```
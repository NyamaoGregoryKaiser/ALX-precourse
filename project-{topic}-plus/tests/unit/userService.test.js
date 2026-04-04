```javascript
const userService = require('../../src/services/userService');
const userRepository = require('../../src/repositories/userRepository');
const AppError = require('../../src/utils/appError');
const APIFeatures = require('../../src/utils/apiFeatures');
const bcrypt = require('bcryptjs');
const { prisma } = require('../../src/config/db'); // Needed for APIFeatures mock

// Mock external dependencies
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/utils/apiFeatures');
jest.mock('bcryptjs');
jest.mock('../../src/config/db', () => ({
  prisma: { // Mock prisma client for APIFeatures constructor
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const userId = 'user123';
      const user = { id: userId, username: 'testuser', email: 'test@example.com', role: 'USER' };
      userRepository.findById.mockResolvedValue(user);

      const result = await userService.getUserById(userId);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(user);
    });

    it('should throw AppError if user not found', async () => {
      const userId = 'nonexistent';
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(userId)).rejects.toThrow(
        new AppError('User not found.', 404)
      );
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfile', () => {
    const userId = 'user123';
    const existingUser = { id: userId, username: 'olduser', email: 'old@example.com', role: 'USER' };

    it('should update username and email successfully', async () => {
      const updateData = { username: 'newuser', email: 'new@example.com' };
      const updatedUser = { ...existingUser, ...updateData };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.findByEmail.mockResolvedValue(null); // New email not taken
      userRepository.findByUsername.mockResolvedValue(null); // New username not taken
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateProfile(userId, updateData);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(updateData.email);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(updateData.username);
      expect(userRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should throw AppError if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(userService.updateProfile('nonexistent', { username: 'new' })).rejects.toThrow(
        new AppError('User not found.', 404)
      );
    });

    it('should throw AppError if trying to update role', async () => {
      userRepository.findById.mockResolvedValue(existingUser);
      await expect(userService.updateProfile(userId, { role: 'ADMIN' })).rejects.toThrow(
        new AppError('Cannot update user role via this endpoint.', 403)
      );
    });

    it('should throw AppError if new email is already taken', async () => {
      const updateData = { email: 'taken@example.com' };
      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.findByEmail.mockResolvedValue({ id: 'anotherUser' }); // Email taken

      await expect(userService.updateProfile(userId, updateData)).rejects.toThrow(
        new AppError('Email already registered.', 409)
      );
    });

    it('should throw AppError if new username is already taken', async () => {
      const updateData = { username: 'takenuser' };
      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue({ id: 'anotherUser' }); // Username taken

      await expect(userService.updateProfile(userId, updateData)).rejects.toThrow(
        new AppError('Username already taken.', 409)
      );
    });
  });

  describe('updatePassword', () => {
    const userId = 'user123';
    const oldPasswordHash = 'oldhashedpass';
    const existingUserWithPass = {
      id: userId,
      email: 'test@example.com',
      password: oldPasswordHash,
    };
    const newPasswordHash = 'newhashedpass';

    it('should update password successfully', async () => {
      userRepository.findById.mockResolvedValue(existingUserWithPass); // Mock withPassword: true behavior
      bcrypt.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false); // Old correct, new different
      bcrypt.hash.mockResolvedValue(newPasswordHash);
      userRepository.update.mockResolvedValue({ ...existingUserWithPass, password: newPasswordHash });

      const result = await userService.updatePassword(userId, 'oldpassword', 'newpassword');

      expect(userRepository.findById).toHaveBeenCalledWith(userId, true);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', oldPasswordHash);
      expect(bcrypt.compare).toHaveBeenCalledWith('newpassword', oldPasswordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      expect(userRepository.update).toHaveBeenCalledWith(userId, { password: newPasswordHash });
      expect(result).toEqual({ ...existingUserWithPass, password: newPasswordHash });
    });

    it('should throw AppError if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(userService.updatePassword('nonexistent', 'old', 'new')).rejects.toThrow(
        new AppError('User not found.', 404)
      );
    });

    it('should throw AppError if current password is incorrect', async () => {
      userRepository.findById.mockResolvedValue(existingUserWithPass);
      bcrypt.compare.mockResolvedValueOnce(false); // Old incorrect

      await expect(userService.updatePassword(userId, 'wrongpass', 'newpass')).rejects.toThrow(
        new AppError('Current password is incorrect.', 401)
      );
    });

    it('should throw AppError if new password is same as current', async () => {
      userRepository.findById.mockResolvedValue(existingUserWithPass);
      bcrypt.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(true); // Old correct, new same

      await expect(userService.updatePassword(userId, 'oldpassword', 'oldpassword')).rejects.toThrow(
        new AppError('New password cannot be the same as the current password.', 400)
      );
    });
  });

  describe('deactivateAccount', () => {
    const userId = 'user123';
    const existingUser = { id: userId, email: 'test@example.com', role: 'USER' };

    it('should delete user successfully', async () => {
      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.delete.mockResolvedValue(existingUser);

      await userService.deactivateAccount(userId);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw AppError if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(userService.deactivateAccount('nonexistent')).rejects.toThrow(
        new AppError('User not found.', 404)
      );
    });
  });

  describe('getAllUsers (Admin only)', () => {
    it('should return all users with pagination and filtering capabilities', async () => {
      const queryString = { page: '1', limit: '2', sort: 'username' };
      const users = [{ id: 'u1', username: 'a' }, { id: 'u2', username: 'b' }];
      const totalCount = 5;

      APIFeatures.mockImplementation(() => ({
        filter: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limitFields: jest.fn().mockReturnThis(),
        paginate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(users),
        count: jest.fn().mockResolvedValue(totalCount),
      }));

      const result = await userService.getAllUsers(queryString);

      expect(APIFeatures).toHaveBeenCalledWith(prisma.user, queryString);
      expect(APIFeatures.mock.results[0].value.filter).toHaveBeenCalled();
      expect(APIFeatures.mock.results[0].value.sort).toHaveBeenCalled();
      expect(APIFeatures.mock.results[0].value.limitFields).toHaveBeenCalled();
      expect(APIFeatures.mock.results[0].value.paginate).toHaveBeenCalled();
      expect(result).toEqual({
        results: users.length,
        total: totalCount,
        users,
      });
    });
  });

  describe('updateUserRole (Admin only)', () => {
    const userId = 'user123';
    const existingUser = { id: userId, email: 'test@example.com', role: 'USER' };

    it('should update user role successfully', async () => {
      const newRole = 'ADMIN';
      const updatedUser = { ...existingUser, role: newRole };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserRole(userId, newRole);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.update).toHaveBeenCalledWith(userId, { role: newRole });
      expect(result).toEqual(updatedUser);
    });

    it('should throw AppError if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(userService.updateUserRole('nonexistent', 'ADMIN')).rejects.toThrow(
        new AppError('User not found.', 404)
      );
    });

    it('should throw AppError if invalid role is provided', async () => {
      userRepository.findById.mockResolvedValue(existingUser);
      await expect(userService.updateUserRole(userId, 'INVALID_ROLE')).rejects.toThrow(
        new AppError('Invalid user role provided.', 400)
      );
    });
  });

  describe('deleteUser (Admin only)', () => {
    const userId = 'user123';
    const existingUser = { id: userId, email: 'test@example.com', role: 'USER' };

    it('should delete user successfully', async () => {
      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.delete.mockResolvedValue(existingUser);

      await userService.deleteUser(userId);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw AppError if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(userService.deleteUser('nonexistent')).rejects.toThrow(
        new AppError('User not found.', 404)
      );
    });
  });
});
```
```javascript
import httpStatus from 'http-status';
import userService from '../../src/services/userService';
import userRepository from '../../src/repositories/userRepository';
import ApiError from '../../src/utils/ApiError';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../src/repositories/userRepository');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));


describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getUserById', () => {
    test('should return user if found', async () => {
      userRepository.findUserById.mockResolvedValue(mockUser);
      const user = await userService.getUserById(mockUser.id);
      expect(user).toEqual(mockUser);
      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUser.id);
    });

    test('should throw ApiError if user not found', async () => {
      userRepository.findUserById.mockResolvedValue(null);
      await expect(userService.getUserById('nonexistentId')).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, 'User not found')
      );
    });
  });

  describe('getUserByEmail', () => {
    test('should return user if found by email', async () => {
      userRepository.findUserByEmail.mockResolvedValue(mockUser);
      const user = await userService.getUserByEmail(mockUser.email);
      expect(user).toEqual(mockUser);
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    test('should throw ApiError if user not found by email', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null);
      await expect(userService.getUserByEmail('nonexistent@example.com')).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, 'User not found')
      );
    });
  });

  describe('updateUserById', () => {
    const updatedUsername = 'newusername';
    const updatedEmail = 'new@example.com';
    const updateBody = { username: updatedUsername, email: updatedEmail };

    test('should update user successfully', async () => {
      userRepository.findUserById.mockResolvedValue(mockUser);
      userRepository.findUserByEmail.mockResolvedValue(null); // New email not taken
      userRepository.findUserByUsername.mockResolvedValue(null); // New username not taken
      userRepository.updateUser.mockResolvedValue({ ...mockUser, ...updateBody });

      const updatedUser = await userService.updateUserById(mockUser.id, updateBody);

      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUser.id);
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(updatedEmail);
      expect(userRepository.findUserByUsername).toHaveBeenCalledWith(updatedUsername);
      expect(userRepository.updateUser).toHaveBeenCalledWith(mockUser.id, updateBody);
      expect(updatedUser).toEqual({ ...mockUser, ...updateBody });
    });

    test('should throw ApiError if user not found', async () => {
      userRepository.findUserById.mockResolvedValue(null);
      await expect(userService.updateUserById('nonexistentId', updateBody)).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, 'User not found')
      );
    });

    test('should throw ApiError if new email is already taken by another user', async () => {
      userRepository.findUserById.mockResolvedValue(mockUser);
      userRepository.findUserByEmail.mockResolvedValue({ id: 'anotherUserId' }); // Email taken by someone else

      await expect(userService.updateUserById(mockUser.id, { email: updatedEmail })).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, 'Email already taken')
      );
    });

    test('should allow updating with same email', async () => {
      userRepository.findUserById.mockResolvedValue(mockUser);
      userRepository.findUserByEmail.mockResolvedValue(mockUser); // Same email, same user
      userRepository.updateUser.mockResolvedValue({ ...mockUser, username: updatedUsername });

      const updatedUser = await userService.updateUserById(mockUser.id, { username: updatedUsername, email: mockUser.email });

      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUser.id);
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(mockUser.email); // Still checks but passes
      expect(userRepository.updateUser).toHaveBeenCalledWith(mockUser.id, { username: updatedUsername, email: mockUser.email });
      expect(updatedUser.username).toBe(updatedUsername);
    });

    test('should throw ApiError if new username is already taken by another user', async () => {
      userRepository.findUserById.mockResolvedValue(mockUser);
      userRepository.findUserByUsername.mockResolvedValue({ id: 'anotherUserId' }); // Username taken by someone else

      await expect(userService.updateUserById(mockUser.id, { username: updatedUsername })).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, 'Username already taken')
      );
    });

    test('should allow updating with same username', async () => {
        userRepository.findUserById.mockResolvedValue(mockUser);
        userRepository.findUserByEmail.mockResolvedValue(null);
        userRepository.findUserByUsername.mockResolvedValue(mockUser); // Same username, same user
        userRepository.updateUser.mockResolvedValue({ ...mockUser, email: updatedEmail });

        const updatedUser = await userService.updateUserById(mockUser.id, { username: mockUser.username, email: updatedEmail });

        expect(userRepository.findUserById).toHaveBeenCalledWith(mockUser.id);
        expect(userRepository.findUserByUsername).toHaveBeenCalledWith(mockUser.username); // Still checks but passes
        expect(userRepository.updateUser).toHaveBeenCalledWith(mockUser.id, { username: mockUser.username, email: updatedEmail });
        expect(updatedUser.email).toBe(updatedEmail);
    });
  });

  describe('deleteUserById', () => {
    test('should delete user successfully', async () => {
      userRepository.findUserById.mockResolvedValue(mockUser);
      userRepository.deleteUser.mockResolvedValue(mockUser);

      const deletedUser = await userService.deleteUserById(mockUser.id);

      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUser.id);
      expect(userRepository.deleteUser).toHaveBeenCalledWith(mockUser.id);
      expect(deletedUser).toEqual(mockUser);
    });

    test('should throw ApiError if user not found', async () => {
      userRepository.findUserById.mockResolvedValue(null);
      await expect(userService.deleteUserById('nonexistentId')).rejects.toThrow(
        new ApiError(httpStatus.NOT_FOUND, 'User not found')
      );
    });
  });

  describe('getAllUsers', () => {
    test('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user456', username: 'another' }];
      userRepository.findAllUsers.mockResolvedValue(mockUsers);

      const users = await userService.getAllUsers();
      expect(users).toEqual(mockUsers);
      expect(userRepository.findAllUsers).toHaveBeenCalled();
    });
  });
});
```

**Integration Tests (Jest, Supertest)**
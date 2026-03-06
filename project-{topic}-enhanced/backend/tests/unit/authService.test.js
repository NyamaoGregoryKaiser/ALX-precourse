```javascript
import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import authService from '../../src/services/authService';
import userRepository from '../../src/repositories/userRepository';
import tokenService from '../../src/services/tokenService';
import cache from '../../src/utils/cache';
import ApiError from '../../src/utils/ApiError';
import config from '../../src/config'; // Import config to access JWT settings
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock dependencies
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/services/tokenService');
jest.mock('../../src/utils/cache');
jest.mock('bcryptjs');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure mocks return reasonable defaults for common scenarios
    uuidv4.mockReturnValue('mock-uuid-123');
    bcrypt.hash.mockResolvedValue('hashedpassword');
    bcrypt.compare.mockResolvedValue(true);
    tokenService.generateAuthTokens.mockReturnValue({
      accessToken: { token: 'mockAccessToken', expires: new Date(), expiresIn: 3600 },
      refreshToken: { token: 'mockRefreshToken', expires: new Date(), expiresIn: 7 * 24 * 3600 },
    });
    tokenService.verifyToken.mockReturnValue({ sub: 'mockUserId', type: 'refresh' });
    cache.set.mockResolvedValue('OK');
    cache.get.mockResolvedValue(null); // Default to cache miss
    cache.del.mockResolvedValue(1);
  });

  describe('register', () => {
    const mockUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };
    const mockCreatedUser = {
      id: 'mock-uuid-123',
      username: 'testuser',
      email: 'test@example.com',
    };

    test('should register a new user successfully', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null);
      userRepository.findUserByUsername.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue(mockCreatedUser);

      const result = await authService.register(mockUserData);

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepository.findUserByUsername).toHaveBeenCalledWith(mockUserData.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(userRepository.createUser).toHaveBeenCalledWith({
        id: 'mock-uuid-123',
        username: mockUserData.username,
        email: mockUserData.email,
        passwordHash: 'hashedpassword',
      });
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockCreatedUser.id);
      expect(cache.set).toHaveBeenCalledWith(
        `refreshToken:${mockCreatedUser.id}`,
        'mockRefreshToken',
        expect.any(Number) // Check that expiresIn is a number
      );
      expect(result.user).toEqual(mockCreatedUser);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    test('should throw ApiError if email is already taken', async () => {
      userRepository.findUserByEmail.mockResolvedValue({ id: 'existingId' });

      await expect(authService.register(mockUserData)).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, 'Email already taken')
      );
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepository.findUserByUsername).not.toHaveBeenCalled();
      expect(userRepository.createUser).not.toHaveBeenCalled();
    });

    test('should throw ApiError if username is already taken', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null);
      userRepository.findUserByUsername.mockResolvedValue({ id: 'existingId' });

      await expect(authService.register(mockUserData)).rejects.toThrow(
        new ApiError(httpStatus.BAD_REQUEST, 'Username already taken')
      );
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepository.findUserByUsername).toHaveBeenCalledWith(mockUserData.username);
      expect(userRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'mockUserId',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
    };
    const loginData = { email: 'test@example.com', password: 'password123' };

    test('should log in user successfully', async () => {
      userRepository.findUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.login(loginData.email, loginData.password);

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.passwordHash);
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUser.id);
      expect(cache.set).toHaveBeenCalledWith(
        `refreshToken:${mockUser.id}`,
        'mockRefreshToken',
        expect.any(Number)
      );
      expect(result.user).toEqual({ id: mockUser.id, username: mockUser.username, email: mockUser.email });
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    test('should throw ApiError for incorrect email', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null);

      await expect(authService.login(loginData.email, loginData.password)).rejects.toThrow(
        new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password')
      );
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test('should throw ApiError for incorrect password', async () => {
      userRepository.findUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(loginData.email, loginData.password)).rejects.toThrow(
        new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password')
      );
      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.passwordHash);
      expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
    });
  });

  describe('refreshAuth', () => {
    const mockRefreshToken = 'validRefreshToken';
    const mockUserId = 'mockUserId';
    const mockUser = { id: mockUserId, username: 'testuser', email: 'test@example.com' };

    test('should refresh tokens successfully', async () => {
      tokenService.verifyToken.mockReturnValue({ sub: mockUserId, type: 'refresh' });
      cache.get.mockResolvedValue(mockRefreshToken); // Refresh token found in cache
      userRepository.findUserById.mockResolvedValue(mockUser);

      const result = await authService.refreshAuth(mockRefreshToken);

      expect(tokenService.verifyToken).toHaveBeenCalledWith(mockRefreshToken, 'refresh');
      expect(cache.get).toHaveBeenCalledWith(`refreshToken:${mockUserId}`);
      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUserId);
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUserId);
      expect(cache.set).toHaveBeenCalledWith(
        `refreshToken:${mockUserId}`,
        'mockRefreshToken',
        expect.any(Number)
      );
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    test('should throw ApiError if refresh token is invalid', async () => {
      tokenService.verifyToken.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshAuth('invalidToken')).rejects.toThrow(
        new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate')
      );
      expect(cache.get).not.toHaveBeenCalled();
      expect(userRepository.findUserById).not.toHaveBeenCalled();
    });

    test('should throw ApiError if refresh token not found in cache', async () => {
      tokenService.verifyToken.mockReturnValue({ sub: mockUserId, type: 'refresh' });
      cache.get.mockResolvedValue(null); // Refresh token NOT found in cache

      await expect(authService.refreshAuth(mockRefreshToken)).rejects.toThrow(
        new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token or token revoked')
      );
      expect(cache.get).toHaveBeenCalledWith(`refreshToken:${mockUserId}`);
      expect(userRepository.findUserById).not.toHaveBeenCalled();
    });

    test('should throw ApiError if user not found for refresh token', async () => {
      tokenService.verifyToken.mockReturnValue({ sub: mockUserId, type: 'refresh' });
      cache.get.mockResolvedValue(mockRefreshToken);
      userRepository.findUserById.mockResolvedValue(null); // User NOT found

      await expect(authService.refreshAuth(mockRefreshToken)).rejects.toThrow(
        new ApiError(httpStatus.UNAUTHORIZED, 'User not found for refresh token')
      );
      expect(userRepository.findUserById).toHaveBeenCalledWith(mockUserId);
      expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockUserId = 'mockUserId';

    test('should delete refresh token from cache', async () => {
      await authService.logout(mockUserId);

      expect(cache.del).toHaveBeenCalledWith(`refreshToken:${mockUserId}`);
    });
  });

  describe('isEmailTaken', () => {
    test('should return true if email is taken', async () => {
      userRepository.findUserByEmail.mockResolvedValue({ id: 'existingId' });
      expect(await authService.isEmailTaken('taken@example.com')).toBe(true);
    });

    test('should return false if email is not taken', async () => {
      userRepository.findUserByEmail.mockResolvedValue(null);
      expect(await authService.isEmailTaken('not_taken@example.com')).toBe(false);
    });
  });

  describe('isUsernameTaken', () => {
    test('should return true if username is taken', async () => {
      userRepository.findUserByUsername.mockResolvedValue({ id: 'existingId' });
      expect(await authService.isUsernameTaken('takenusername')).toBe(true);
    });

    test('should return false if username is not taken', async () => {
      userRepository.findUserByUsername.mockResolvedValue(null);
      expect(await authService.isUsernameTaken('freeusername')).toBe(false);
    });
  });
});
```
import authService from '../../src/auth/auth.service.js';
import prisma from '../../src/utils/prisma.js';
import AppError from '../../src/utils/appError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import { redisClient } from '../../src/middleware/cache.js';
import { Role } from '@prisma/client';

// Mock Prisma client
jest.mock('../../src/utils/prisma', () => ({
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
}));

// Mock Redis client (only necessary methods)
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  })),
}));

// Mock bcrypt and jwt
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Service', () => {
  const mockUser = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.jwt.secret = 'test_secret'; // Ensure consistent secret for testing
    config.jwt.accessExpirationMinutes = 1;
    config.jwt.refreshExpirationDays = 1;
  });

  // --- Register User Tests ---
  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // No existing user
      bcrypt.hash.mockResolvedValue('hashedPassword');
      prisma.user.create.mockResolvedValue({ ...mockUser, password: undefined }); // Return user without password hash

      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      const newUser = await authService.registerUser(userData);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ username: userData.username }, { email: userData.email }] },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          password: 'hashedPassword',
          role: Role.USER,
        },
        select: expect.any(Object),
      });
      expect(newUser).toEqual(expect.objectContaining({ username: 'newuser', email: 'new@example.com' }));
    });

    it('should throw AppError if email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, email: 'existing@example.com' });
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(
        new AppError('User with this email already exists.', 409)
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw AppError if username already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, username: 'existinguser' });
      const userData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Password123!',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(
        new AppError('User with this username already exists.', 409)
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // --- Login User Tests ---
  describe('loginUser', () => {
    it('should log in user and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockAccessToken').mockReturnValueOnce('mockRefreshToken'); // Mock sequentially
      redisClient.set.mockResolvedValue('OK');

      const result = await authService.loginUser(mockUser.email, 'correctPassword');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: mockUser.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', mockUser.password);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens.access.token).toBe('mockAccessToken');
      expect(result.tokens.refresh.token).toBe('mockRefreshToken');
      expect(redisClient.set).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError for incorrect email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.loginUser('wrong@example.com', 'password')).rejects.toThrow(
        new AppError('Incorrect email or password', 401)
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw AppError for incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.loginUser(mockUser.email, 'wrongPassword')).rejects.toThrow(
        new AppError('Incorrect email or password', 401)
      );
    });
  });

  // --- Refresh Tokens Tests ---
  describe('refreshTokens', () => {
    const mockRefreshToken = 'mockRefreshToken';
    const mockAccessToken = 'mockAccessToken';

    it('should refresh tokens successfully', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role });
      redisClient.get.mockResolvedValue('true'); // Refresh token is valid in Redis
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValueOnce(mockAccessToken).mockReturnValueOnce('newMockRefreshToken');
      redisClient.del.mockResolvedValue(1);
      redisClient.set.mockResolvedValue('OK');

      const result = await authService.refreshTokens(mockRefreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockRefreshToken, config.jwt.secret);
      expect(redisClient.get).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:${mockRefreshToken}`);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:${mockRefreshToken}`);
      expect(redisClient.set).toHaveBeenCalledTimes(1);
      expect(result.access.token).toBe(mockAccessToken);
      expect(result.refresh.token).toBe('newMockRefreshToken');
    });

    it('should throw AppError if refresh token is expired', async () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new AppError('Refresh token expired.', 401)
      );
      expect(redisClient.get).not.toHaveBeenCalled();
    });

    it('should throw AppError if refresh token not found in Redis', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role });
      redisClient.get.mockResolvedValue(null); // Not found in Redis

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new AppError('Refresh token expired or invalid (not found in store).', 401)
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw AppError if user not found', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role });
      redisClient.get.mockResolvedValue('true');
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new AppError('User not found.', 401)
      );
    });

    it('should throw AppError for invalid refresh token', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

      await expect(authService.refreshTokens('invalidToken')).rejects.toThrow(
        new AppError('Invalid refresh token.', 401)
      );
    });
  });

  // --- Logout User Tests ---
  describe('logoutUser', () => {
    const mockRefreshToken = 'mockRefreshToken';

    it('should invalidate refresh token and logout user', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id });
      redisClient.exists.mockResolvedValue(1); // Token exists
      redisClient.del.mockResolvedValue(1);

      await authService.logoutUser(mockRefreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockRefreshToken, config.jwt.secret);
      expect(redisClient.exists).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:${mockRefreshToken}`);
      expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:${mockRefreshToken}`);
    });

    it('should not throw error if refresh token does not exist in Redis', async () => {
      jwt.verify.mockReturnValue({ sub: mockUser.id });
      redisClient.exists.mockResolvedValue(0); // Token does not exist

      await expect(authService.logoutUser(mockRefreshToken)).resolves.toBeUndefined();
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('should throw AppError for invalid refresh token during logout', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

      await expect(authService.logoutUser('invalidToken')).rejects.toThrow(
        new AppError('Invalid refresh token for logout.', 401)
      );
      expect(redisClient.exists).not.toHaveBeenCalled();
    });
  });
});
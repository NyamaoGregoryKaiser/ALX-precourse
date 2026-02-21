```typescript
import { AppDataSource } from '../../src/dataSource';
import { User, UserRole } from '../../src/entities/User';
import * as authService from '../../src/services/auth.service';
import { AppError } from '../../src/utils/appError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

// Mock TypeORM repository
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password, salt) => 'hashedPassword123'),
  compare: jest.fn((password, hash) => true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret, options) => `mockToken.${payload.id}`),
  verify: jest.fn((token, secret) => ({ id: 'mockUserId', role: UserRole.USER })),
}));

// Setup before each test
beforeEach(() => {
  jest.clearAllMocks(); // Clear mocks before each test
  // Manually mock getRepository for each test, as `AppDataSource` is initialized in setup.ts
  jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockUserRepository as any);
  // Ensure env variables are consistent for tests
  env.JWT_SECRET = 'test_jwt_secret';
  env.REFRESH_TOKEN_SECRET = 'test_refresh_secret';
  env.JWT_EXPIRATION_TIME = '1h';
  env.REFRESH_TOKEN_EXPIRATION_TIME = '7d';
});

describe('Auth Service Unit Tests', () => {
  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // User does not exist
      mockUserRepository.create.mockReturnValue({
        id: 'newUserId',
        username: 'testuser',
        email: 'new@example.com',
        password: 'hashedPassword123',
        role: UserRole.USER,
      });
      mockUserRepository.save.mockResolvedValue({
        id: 'newUserId',
        username: 'testuser',
        email: 'new@example.com',
        password: 'hashedPassword123',
        role: UserRole.USER,
      });

      const user = await authService.registerUser('new@example.com', 'password123', 'testuser');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'new@example.com' } });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'new@example.com',
        password: 'password123',
        role: UserRole.USER,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(user).toHaveProperty('id', 'newUserId');
      expect(user).toHaveProperty('email', 'new@example.com');
    });

    it('should throw an AppError if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existingId', email: 'existing@example.com' }); // User exists

      await expect(authService.registerUser('existing@example.com', 'password123', 'existinguser'))
        .rejects.toThrow(AppError);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an AppError for generic database save error', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ email: 'error@example.com', password: 'pass', username: 'error' });
      mockUserRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(authService.registerUser('error@example.com', 'password', 'erroruser'))
        .rejects.toThrow(AppError);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should successfully log in a user and return tokens', async () => {
      const mockUser = { id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword123', username: 'testuser', role: UserRole.USER };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (secret === env.JWT_SECRET) return `accessToken.${payload.id}`;
        if (secret === env.REFRESH_TOKEN_SECRET) return `refreshToken.${payload.id}`;
        return 'unknown_token';
      });


      const { accessToken, refreshToken, user } = await authService.loginUser('test@example.com', 'password123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email', 'password', 'username', 'role'],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(accessToken).toBe('accessToken.mockUserId');
      expect(refreshToken).toBe('refreshToken.mockUserId');
      expect(user).toEqual(mockUser);
    });

    it('should throw an AppError for invalid credentials (user not found)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(authService.loginUser('nonexistent@example.com', 'password'))
        .rejects.toThrow(AppError);
      expect(AppError).toHaveBeenCalledWith('Invalid credentials', 401);
    });

    it('should throw an AppError for invalid credentials (incorrect password)', async () => {
      const mockUser = { id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword123', username: 'testuser', role: UserRole.USER };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Incorrect password

      await expect(authService.loginUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow(AppError);
      expect(AppError).toHaveBeenCalledWith('Invalid credentials', 401);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockDecoded = { id: 'mockUserId', iat: 12345, exp: 67890 };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      const mockUser = { id: 'mockUserId', email: 'test@example.com', username: 'testuser', role: UserRole.USER };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (secret === env.JWT_SECRET) return `newAccessToken.${payload.id}`;
        if (secret === env.REFRESH_TOKEN_SECRET) return `newRefreshToken.${payload.id}`;
        return 'unknown_token';
      });

      const { accessToken, newRefreshToken } = await authService.refreshAccessToken('validRefreshToken');

      expect(jwt.verify).toHaveBeenCalledWith('validRefreshToken', env.REFRESH_TOKEN_SECRET);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 'mockUserId' } });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(accessToken).toBe('newAccessToken.mockUserId');
      expect(newRefreshToken).toBe('newRefreshToken.mockUserId');
    });

    it('should throw an AppError if refresh token is expired', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date(0));
      });

      await expect(authService.refreshAccessToken('expiredRefreshToken'))
        .rejects.toThrow(AppError);
      expect(AppError).toHaveBeenCalledWith('Refresh token expired', 401);
    });

    it('should throw an AppError if refresh token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refreshAccessToken('invalidRefreshToken'))
        .rejects.toThrow(AppError);
      expect(AppError).toHaveBeenCalledWith('Invalid refresh token', 401);
    });

    it('should throw an AppError if user not found for refresh token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'nonexistentUserId' });
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(authService.refreshAccessToken('validRefreshToken'))
        .rejects.toThrow(AppError);
      expect(AppError).toHaveBeenCalledWith('User not found for refresh token', 401);
    });
  });
});
```
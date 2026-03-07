```typescript
import * as authService from '../../../src/services/auth.service';
import { AppDataSource } from '../../../src/data-source';
import { User, UserRole } from '../../../src/entities/User';
import { BadRequestError, UnauthorizedError } from '../../../src/middleware/errorHandler.middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '../../../src/config/env';
import { getRedisClient } from '../../../src/config/redis';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Service', () => {
  let userRepository = AppDataSource.getRepository(User);
  let redisClient = getRedisClient();

  beforeEach(async () => {
    // Reset mocks
    mockBcrypt.hash.mockClear();
    mockBcrypt.compare.mockClear();
    mockJwt.sign.mockClear();
    mockJwt.verify.mockClear();

    // Mock Redis interactions directly as `getRedisClient()` is already configured for tests.
    // We only need to ensure specific calls like setEx and get are working.
    jest.spyOn(redisClient, 'setEx').mockResolvedValue('OK');
    jest.spyOn(redisClient, 'get').mockResolvedValue(null); // Default to not found
    jest.spyOn(redisClient, 'del').mockResolvedValue(1);
  });

  // --- Register User ---
  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      mockBcrypt.hash.mockResolvedValue('hashedPassword123');
      const user = await authService.registerUser('testuser', 'test@example.com', 'password123');

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('hashedPassword123');
      expect(user.roles).toEqual([UserRole.USER]);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);

      const savedUser = await userRepository.findOneBy({ id: user.id });
      expect(savedUser).toEqual(user);
    });

    it('should throw BadRequestError if username already exists', async () => {
      await authService.registerUser('existinguser', 'unique@example.com', 'password');
      await expect(authService.registerUser('existinguser', 'another@example.com', 'password')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if email already exists', async () => {
      await authService.registerUser('uniqueuser', 'existing@example.com', 'password');
      await expect(authService.registerUser('anotheruser', 'existing@example.com', 'password')).rejects.toThrow(BadRequestError);
    });
  });

  // --- Login User ---
  describe('loginUser', () => {
    const mockUser = new User();
    mockUser.id = 'user123';
    mockUser.username = 'loginuser';
    mockUser.email = 'login@example.com';
    mockUser.passwordHash = 'hashedPasswordLogin';
    mockUser.roles = [UserRole.USER];

    beforeEach(async () => {
      await userRepository.save(mockUser); // Ensure user exists in DB for login tests
    });

    it('should successfully log in a user with username', async () => {
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign
        .mockReturnValueOnce('accessToken123')
        .mockReturnValueOnce('refreshToken456');

      const { user, accessToken, refreshToken } = await authService.loginUser('loginuser', 'validpassword');

      expect(user.username).toBe('loginuser');
      expect(accessToken).toBe('accessToken123');
      expect(refreshToken).toBe('refreshToken456');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('validpassword', 'hashedPasswordLogin');
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(redisClient.setEx).toHaveBeenCalledWith(
        `refreshToken:${mockUser.id}:${refreshToken}`,
        'active',
        expect.any(Number) // JWT_REFRESH_EXPIRES_IN converted to number
      );
    });

    it('should successfully log in a user with email', async () => {
        mockBcrypt.compare.mockResolvedValue(true);
        mockJwt.sign
          .mockReturnValueOnce('accessToken123')
          .mockReturnValueOnce('refreshToken456');

        const { user, accessToken, refreshToken } = await authService.loginUser('login@example.com', 'validpassword');

        expect(user.email).toBe('login@example.com');
        expect(accessToken).toBe('accessToken123');
        expect(refreshToken).toBe('refreshToken456');
        expect(mockBcrypt.compare).toHaveBeenCalledWith('validpassword', 'hashedPasswordLogin');
        expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      });

    it('should throw UnauthorizedError for invalid password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      await expect(authService.loginUser('loginuser', 'wrongpassword')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      await expect(authService.loginUser('nonexistent', 'password')).rejects.toThrow(UnauthorizedError);
    });
  });

  // --- Refresh Access Token ---
  describe('refreshAccessToken', () => {
    const mockRefreshToken = 'validRefreshToken';
    const mockUserId = 'user789';

    beforeEach(async () => {
      // Setup a user for refresh token logic
      const userForRefresh = new User();
      userForRefresh.id = mockUserId;
      userForRefresh.username = 'refreshuser';
      userForRefresh.email = 'refresh@example.com';
      userForRefresh.passwordHash = 'hashed';
      userForRefresh.roles = [UserRole.USER];
      await userRepository.save(userForRefresh);
    });

    it('should successfully refresh access token', async () => {
      mockJwt.verify.mockReturnValue({ id: mockUserId, username: 'refreshuser', email: 'refresh@example.com', roles: [UserRole.USER] });
      mockJwt.sign
        .mockReturnValueOnce('newAccessToken')
        .mockReturnValueOnce('newRefreshToken');
      jest.spyOn(redisClient, 'get').mockResolvedValue('active'); // Token is active

      const { accessToken, refreshToken } = await authService.refreshAccessToken(mockRefreshToken);

      expect(accessToken).toBe('newAccessToken');
      expect(refreshToken).toBe('newRefreshToken');
      expect(mockJwt.verify).toHaveBeenCalledWith(mockRefreshToken, JWT_REFRESH_SECRET);
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${mockUserId}:${mockRefreshToken}`);
      expect(redisClient.setEx).toHaveBeenCalledWith(
        `refreshToken:${mockUserId}:${newRefreshToken}`,
        'active',
        expect.any(Number)
      );
    });

    it('should throw UnauthorizedError if refresh token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      await expect(authService.refreshAccessToken('invalidToken')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if refresh token is revoked or expired in Redis', async () => {
      mockJwt.verify.mockReturnValue({ id: mockUserId });
      jest.spyOn(redisClient, 'get').mockResolvedValue(null); // Token not found in Redis

      await expect(authService.refreshAccessToken(mockRefreshToken)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if user not found for refresh token', async () => {
      mockJwt.verify.mockReturnValue({ id: 'nonexistentUserId' });
      jest.spyOn(redisClient, 'get').mockResolvedValue('active'); // Token is active in Redis

      await expect(authService.refreshAccessToken(mockRefreshToken)).rejects.toThrow(UnauthorizedError);
    });
  });

  // --- Logout User ---
  describe('logoutUser', () => {
    const mockUserId = 'userLogout';
    const mockRefreshToken = 'logoutRefreshToken';

    it('should delete the refresh token from Redis', async () => {
      await authService.logoutUser(mockUserId, mockRefreshToken);
      expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${mockUserId}:${mockRefreshToken}`);
    });
  });
});
```
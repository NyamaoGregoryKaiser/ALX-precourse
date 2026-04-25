```javascript
const bcrypt = require('bcryptjs');
const { User } = require('../../db/models');
const authService = require('../../services/authService');
const jwt = require('../../utils/jwt');
const cache = require('../../utils/cache');
const { AppError } = require('../../utils/errorHandler');
const config = require('../../config/config');

// Mock external dependencies
jest.mock('../../db/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    scope: jest.fn().mockReturnThis(), // Mock scope chain
  },
}));
jest.mock('../../utils/jwt');
jest.mock('../../utils/cache');
jest.mock('bcryptjs');

describe('Auth Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  // Mock a user object
  const mockUser = {
    id: 'test-uuid-1',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'user',
    comparePassword: jest.fn(),
  };

  describe('registerUser', () => {
    it('should register a new user and return tokens', async () => {
      User.findOne.mockResolvedValue(null); // User does not exist
      User.create.mockResolvedValue(mockUser);
      jwt.generateAccessToken.mockReturnValue('newAccessToken');
      jwt.generateRefreshToken.mockReturnValue('newRefreshToken');
      cache.set.mockResolvedValue('OK');

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      };

      const result = await authService.registerUser(userData);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(jwt.generateAccessToken).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role });
      expect(jwt.generateRefreshToken).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role });
      expect(cache.set).toHaveBeenCalledWith(
        `refreshToken:${mockUser.id}:newRefreshToken`,
        'true',
        config.jwt.refreshExpiresIn
      );
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      });
    });

    it('should throw AppError if user with email already exists', async () => {
      User.findOne.mockResolvedValue(mockUser); // User already exists

      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(
        new AppError('User with that email already exists', 409)
      );
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should throw an error if User.create fails', async () => {
      User.findOne.mockResolvedValue(null);
      const dbError = new Error('Database error');
      User.create.mockRejectedValue(dbError);

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(dbError);
    });
  });

  describe('loginUser', () => {
    it('should log in a user and return tokens', async () => {
      User.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      jwt.generateAccessToken.mockReturnValue('newAccessToken');
      jwt.generateRefreshToken.mockReturnValue('newRefreshToken');
      cache.delPattern.mockResolvedValue(1);
      cache.set.mockResolvedValue('OK');

      const email = 'test@example.com';
      const password = 'password123';

      const result = await authService.loginUser(email, password);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email }, attributes: { include: ['password'] } });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(password);
      expect(jwt.generateAccessToken).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role });
      expect(jwt.generateRefreshToken).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role });
      expect(cache.delPattern).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:*`);
      expect(cache.set).toHaveBeenCalledWith(
        `refreshToken:${mockUser.id}:newRefreshToken`,
        'true',
        config.jwt.refreshExpiresIn
      );
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      });
    });

    it('should throw AppError for incorrect email', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.loginUser('wrong@example.com', 'password123')).rejects.toThrow(
        new AppError('Incorrect email or password', 401)
      );
      expect(mockUser.comparePassword).not.toHaveBeenCalled();
    });

    it('should throw AppError for incorrect password', async () => {
      User.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(
        new AppError('Incorrect email or password', 401)
      );
      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token and rotate refresh token', async () => {
      const oldRefreshToken = 'oldRefreshToken';
      const decodedToken = { id: mockUser.id, role: mockUser.role };
      const newAccessToken = 'newAccessToken';
      const newRefreshToken = 'newRefreshToken';

      jwt.verifyRefreshToken.mockReturnValue(decodedToken);
      cache.get.mockResolvedValue('true'); // Old refresh token is valid
      User.findByPk.mockResolvedValue(mockUser);
      jwt.generateAccessToken.mockReturnValue(newAccessToken);
      jwt.generateRefreshToken.mockReturnValue(newRefreshToken);
      cache.del.mockResolvedValue(1);
      cache.set.mockResolvedValue('OK');

      const result = await authService.refreshAccessToken(oldRefreshToken);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(oldRefreshToken);
      expect(cache.get).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:${oldRefreshToken}`);
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
      expect(jwt.generateAccessToken).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role });
      expect(jwt.generateRefreshToken).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role });
      expect(cache.del).toHaveBeenCalledWith(`refreshToken:${mockUser.id}:${oldRefreshToken}`);
      expect(cache.set).toHaveBeenCalledWith(
        `refreshToken:${mockUser.id}:${newRefreshToken}`,
        'true',
        config.jwt.refreshExpiresIn
      );
      expect(result).toEqual({ accessToken: newAccessToken, newRefreshToken });
    });

    it('should throw AppError if refresh token is invalid or expired (Redis)', async () => {
      const oldRefreshToken = 'invalidRefreshToken';
      const decodedToken = { id: mockUser.id, role: mockUser.role };

      jwt.verifyRefreshToken.mockReturnValue(decodedToken);
      cache.get.mockResolvedValue(null); // Refresh token not found in cache

      await expect(authService.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        new AppError('Invalid or expired refresh token. Please log in again.', 401)
      );
    });

    it('should throw AppError if refresh token is invalid (JWT)', async () => {
      const oldRefreshToken = 'invalidJWT';
      jwt.verifyRefreshToken.mockImplementation(() => {
        throw new AppError('Invalid refresh token', 401, 'JsonWebTokenError');
      });

      await expect(authService.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        new AppError('Unable to refresh access token.', 401)
      );
    });

    it('should throw AppError if user not found for refresh token', async () => {
      const oldRefreshToken = 'oldRefreshToken';
      const decodedToken = { id: 'non-existent-user-id', role: 'user' };

      jwt.verifyRefreshToken.mockReturnValue(decodedToken);
      cache.get.mockResolvedValue('true');
      User.findByPk.mockResolvedValue(null); // User not found

      await expect(authService.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        new AppError('User not found for this refresh token.', 401)
      );
    });
  });

  describe('logoutUser', () => {
    it('should invalidate refresh token', async () => {
      const refreshToken = 'someRefreshToken';
      const decodedToken = { id: mockUser.id };

      jwt.verifyRefreshToken.mockReturnValue(decodedToken);
      cache.del.mockResolvedValue(1); // One token deleted

      const result = await authService.logoutUser(refreshToken);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(cache.del).toHaveBeenCalledWith(`refreshToken:${decodedToken.id}:${refreshToken}`);
      expect(result).toBe(true);
    });

    it('should throw AppError if refresh token not found in cache', async () => {
      const refreshToken = 'nonExistentToken';
      const decodedToken = { id: mockUser.id };

      jwt.verifyRefreshToken.mockReturnValue(decodedToken);
      cache.del.mockResolvedValue(0); // Zero tokens deleted

      await expect(authService.logoutUser(refreshToken)).rejects.toThrow(
        new AppError('Refresh token not found or already invalidated.', 404)
      );
    });

    it('should throw AppError if JWT verification fails', async () => {
      const refreshToken = 'invalidJWT';
      jwt.verifyRefreshToken.mockImplementation(() => {
        throw new AppError('Invalid refresh token', 401, 'JsonWebTokenError');
      });

      await expect(authService.logoutUser(refreshToken)).rejects.toThrow(
        new AppError('Failed to logout.', 500)
      );
    });
  });

  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      User.findByPk.mockResolvedValue(mockUser);
      const user = await authService.findUserById(mockUser.id);
      expect(user).toEqual(mockUser);
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      const user = await authService.findUserById('non-existent-id');
      expect(user).toBeNull();
    });

    it('should throw AppError if database operation fails', async () => {
      const dbError = new Error('Database error');
      User.findByPk.mockRejectedValue(dbError);
      await expect(authService.findUserById(mockUser.id)).rejects.toThrow(
        new AppError('Could not retrieve user.', 500)
      );
    });
  });
});
```
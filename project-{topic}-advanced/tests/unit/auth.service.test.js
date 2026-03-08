```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status-codes');
const authService = require('../../src/services/auth.service');
const userService = require('../../src/services/user.service');
const config = require('../../config/config');
const ApiError = require('../../src/utils/apiError');
const { User } = require('../../models');

jest.mock('../../src/services/user.service'); // Mock user service
jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('Auth Service', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      id: 'mockUserId123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
      isPasswordMatch: jest.fn(),
    };
    userService.getUserByEmail.mockClear();
    userService.getUserById.mockClear();
    User.findByPk.mockClear();
    User.findOne.mockClear();
  });

  describe('generateToken', () => {
    test('should generate a valid JWT token', () => {
      const expires = moment().add(1, 'hour');
      const token = authService.generateToken(mockUser.id, expires, 'access');
      const decoded = jwt.verify(token, config.jwt.secret);

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.exp).toBe(expires.unix());
      expect(decoded.type).toBe('access');
    });
  });

  describe('verifyToken', () => {
    test('should return token payload if token is valid', async () => {
      const expires = moment().add(1, 'hour');
      const token = authService.generateToken(mockUser.id, expires, 'access');
      const payload = await authService.verifyToken(token, 'access');

      expect(payload.sub).toBe(mockUser.id);
      expect(payload.type).toBe('access');
    });

    test('should throw ApiError if token is invalid', async () => {
      await expect(authService.verifyToken('invalid-token', 'access')).rejects.toThrow(ApiError);
    });

    test('should throw ApiError if token type mismatch', async () => {
      const expires = moment().add(1, 'hour');
      const token = authService.generateToken(mockUser.id, expires, 'refresh');
      await expect(authService.verifyToken(token, 'access')).rejects.toThrow(ApiError);
    });
  });

  describe('generateAuthTokens', () => {
    test('should generate access and refresh tokens', async () => {
      const tokens = await authService.generateAuthTokens(mockUser);

      expect(tokens).toHaveProperty('access');
      expect(tokens.access).toHaveProperty('token');
      expect(tokens.access).toHaveProperty('expires');

      expect(tokens).toHaveProperty('refresh');
      expect(tokens.refresh).toHaveProperty('token');
      expect(tokens.refresh).toHaveProperty('expires');

      const decodedAccess = jwt.verify(tokens.access.token, config.jwt.secret);
      expect(decodedAccess.sub).toBe(mockUser.id);
      expect(decodedAccess.type).toBe('access');

      const decodedRefresh = jwt.verify(tokens.refresh.token, config.jwt.secret);
      expect(decodedRefresh.sub).toBe(mockUser.id);
      expect(decodedRefresh.type).toBe('refresh');
    });
  });

  describe('loginUserWithEmailAndPassword', () => {
    test('should return user if credentials are correct', async () => {
      userService.getUserByEmail.mockResolvedValue(mockUser);
      mockUser.isPasswordMatch.mockResolvedValue(true);

      const user = await authService.loginUserWithEmailAndPassword(mockUser.email, mockUser.password);
      expect(user).toBe(mockUser);
      expect(userService.getUserByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(mockUser.isPasswordMatch).toHaveBeenCalledWith(mockUser.password);
    });

    test('should throw ApiError if user not found', async () => {
      userService.getUserByEmail.mockResolvedValue(null);

      await expect(authService.loginUserWithEmailAndPassword('nonexistent@example.com', 'password'))
        .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
      expect(userService.getUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    test('should throw ApiError if password mismatch', async () => {
      userService.getUserByEmail.mockResolvedValue(mockUser);
      mockUser.isPasswordMatch.mockResolvedValue(false);

      await expect(authService.loginUserWithEmailAndPassword(mockUser.email, 'wrongpassword'))
        .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
      expect(userService.getUserByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(mockUser.isPasswordMatch).toHaveBeenCalledWith('wrongpassword');
    });
  });
});
```
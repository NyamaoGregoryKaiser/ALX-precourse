const authService = require('../../src/services/authService');
const User = require('../../src/models/User')(require('../../src/config/database'), require('sequelize'));
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');
const { UnauthorizedError, APIError } = require('../../src/utils/errors');
const bcrypt = require('bcryptjs');

// Mock User model and jwt for unit tests
jest.mock('../../src/models/User', () => {
  const SequelizeMock = require('sequelize-mock');
  const DB = new SequelizeMock();
  const UserMock = DB.define('User', {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }, {
    tableName: 'users',
    timestamps: true,
  });

  UserMock.prototype.comparePassword = jest.fn(async (candidatePassword) => candidatePassword === 'password123');

  // Mock static methods
  UserMock.findOne = jest.fn();
  UserMock.create = jest.fn();
  UserMock.findByPk = jest.fn();

  return jest.fn(() => UserMock); // Return a function that returns the mock model
});

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock_jwt_token'),
  verify: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (password) => `hashed_${password}`),
  compare: jest.fn(async (password, hash) => hash === `hashed_${password}`),
}));

describe('AuthService Unit Tests', () => {
  let UserMock;

  beforeEach(() => {
    UserMock = User(); // Get the mocked User model instance
    // Clear mock calls and reset behavior before each test
    UserMock.findOne.mockReset();
    UserMock.create.mockReset();
    UserMock.findByPk.mockReset();
    UserMock.prototype.comparePassword.mockReset();
    jwt.sign.mockClear();
    bcrypt.hash.mockClear();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      UserMock.create.mockResolvedValueOnce({
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        password: 'hashed_password123',
        role: 'user',
      });

      const user = await authService.registerUser('newuser', 'new@example.com', 'password123', 'user');

      expect(UserMock.create).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'hashed_password123',
        role: 'user',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(user).toHaveProperty('email', 'new@example.com');
    });

    it('should throw APIError for duplicate email', async () => {
      const uniqueConstraintError = new Error('Email already in use');
      uniqueConstraintError.name = 'SequelizeUniqueConstraintError';
      UserMock.create.mockRejectedValueOnce(uniqueConstraintError);

      await expect(authService.registerUser('duplicate', 'existing@example.com', 'password123')).rejects.toThrow(APIError);
      await expect(authService.registerUser('duplicate', 'existing@example.com', 'password123')).rejects.toHaveProperty('statusCode', 409);
    });

    it('should throw APIError for other creation failures', async () => {
      UserMock.create.mockRejectedValueOnce(new Error('Database error'));

      await expect(authService.registerUser('fail', 'fail@example.com', 'password123')).rejects.toThrow(APIError);
      await expect(authService.registerUser('fail', 'fail@example.com', 'password123')).rejects.toHaveProperty('statusCode', 500);
    });
  });

  describe('loginUser', () => {
    it('should successfully log in a user and return a token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      UserMock.findOne.mockResolvedValueOnce(mockUser);

      const { user, token } = await authService.loginUser('test@example.com', 'password123');

      expect(UserMock.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, role: mockUser.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn },
      );
      expect(user).toEqual(mockUser);
      expect(token).toBe('mock_jwt_token');
    });

    it('should throw UnauthorizedError for non-existent email', async () => {
      UserMock.findOne.mockResolvedValueOnce(null);

      await expect(authService.loginUser('nonexistent@example.com', 'password123')).rejects.toThrow(UnauthorizedError);
      await expect(authService.loginUser('nonexistent@example.com', 'password123')).rejects.toHaveProperty('statusCode', 401);
    });

    it('should throw UnauthorizedError for incorrect password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      UserMock.findOne.mockResolvedValueOnce(mockUser);

      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(UnauthorizedError);
      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toHaveProperty('statusCode', 401);
    });

    it('should re-throw other errors during login', async () => {
      UserMock.findOne.mockRejectedValueOnce(new Error('Database error'));

      await expect(authService.loginUser('test@example.com', 'password123')).rejects.toThrow('Database error');
    });
  });

  describe('refreshAccessToken (placeholder)', () => {
    it('should throw UnauthorizedError for invalid refresh token', async () => {
      jwt.verify.mockImplementationOnce(() => { throw new Error('Invalid token'); });

      await expect(authService.refreshAccessToken('invalid_refresh_token')).rejects.toThrow(UnauthorizedError);
      await expect(authService.refreshAccessToken('invalid_refresh_token')).rejects.toHaveProperty('statusCode', 401);
    });
  });
});
```
const authService = require('../../services/authService');
const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../../utils/appError');

// Mock User model
jest.mock('../../models/user', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  prototype: {
    matchPassword: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => 'mockSalt'),
  hash: jest.fn(() => 'hashedPassword'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mockToken'),
  verify: jest.fn(),
}));

// Mock logger to prevent actual logging during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  describe('registerUser', () => {
    it('should register a new user and return user data with token', async () => {
      User.findOne.mockResolvedValue(null); // User does not exist
      User.create.mockResolvedValue({
        id: '1',
        username: 'newuser',
        email: 'new@example.com',
        role: 'user',
        password: 'hashedPassword',
      });

      const result = await authService.registerUser('newuser', 'new@example.com', 'password123');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'new@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'mockSalt');
      expect(User.create).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'hashedPassword',
      });
      expect(jwt.sign).toHaveBeenCalledWith({ id: '1' }, 'test_secret', { expiresIn: '1h' });
      expect(result).toEqual({
        id: '1',
        username: 'newuser',
        email: 'new@example.com',
        role: 'user',
        token: 'mockToken',
      });
    });

    it('should throw AppError if user with email already exists', async () => {
      User.findOne.mockResolvedValue(true); // User exists

      await expect(authService.registerUser('existinguser', 'new@example.com', 'password123'))
        .rejects.toThrow(new AppError('User with that email already exists.', 400));
    });
  });

  describe('loginUser', () => {
    it('should login a user and return user data with token', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        password: 'hashedPassword', // This is what would be in the DB
        matchPassword: jest.fn().mockResolvedValue(true),
      };
      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.loginUser('test@example.com', 'password123');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUser.matchPassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith({ id: '1' }, 'test_secret', { expiresIn: '1h' });
      expect(result).toEqual({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        token: 'mockToken',
      });
    });

    it('should throw AppError if user not found', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.loginUser('nonexistent@example.com', 'password123'))
        .rejects.toThrow(new AppError('Invalid credentials (email not found).', 401));
    });

    it('should throw AppError if password does not match', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        password: 'hashedPassword',
        matchPassword: jest.fn().mockResolvedValue(false),
      };
      User.findOne.mockResolvedValue(mockUser);

      await expect(authService.loginUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow(new AppError('Invalid credentials (password incorrect).', 401));
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const token = authService.generateToken('someId');
      expect(jwt.sign).toHaveBeenCalledWith({ id: 'someId' }, 'test_secret', { expiresIn: '1h' });
      expect(token).toBe('mockToken');
    });
  });
});
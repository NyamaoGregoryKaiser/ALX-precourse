```javascript
const authService = require('../../services/authService');
const User = require('../../models/user');
const ApiError = require('../../utils/ApiError');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock User model interactions
jest.mock('../../models/user');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('authService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test for registerUser
  describe('registerUser', () => {
    it('should register a user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'subscriber'
      };
      User.findOne.mockResolvedValue(null); // User does not exist
      User.create.mockResolvedValue({ ...userData, id: 'some-uuid' });
      bcrypt.hash.mockResolvedValue('hashedpassword'); // Mock password hashing

      const user = await authService.registerUser(userData);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(User.create).toHaveBeenCalledWith({ ...userData, password: 'hashedpassword' });
      expect(user).toHaveProperty('id');
      expect(user.username).toBe(userData.username);
    });

    it('should throw ApiError if user already exists', async () => {
      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.findOne.mockResolvedValue(true); // User already exists

      await expect(authService.registerUser(userData)).rejects.toThrow(ApiError);
      await expect(authService.registerUser(userData)).rejects.toHaveProperty('statusCode', 400);
      await expect(authService.registerUser(userData)).rejects.toHaveProperty('message', 'User with that email already exists');
    });

    it('should throw ApiError if required fields are missing', async () => {
      const userData = { username: 'testuser', email: 'test@example.com' }; // Missing password
      await expect(authService.registerUser(userData)).rejects.toThrow(ApiError);
      await expect(authService.registerUser(userData)).rejects.toHaveProperty('statusCode', 400);
    });
  });

  // Test for loginUser
  describe('loginUser', () => {
    it('should login a user and return token', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        isActive: true,
        role: 'subscriber',
        comparePassword: jest.fn().mockResolvedValue(true), // Mock comparePassword
      };
      User.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mocked-jwt-token');

      const { user, token } = await authService.loginUser('test@example.com', 'password123');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, role: mockUser.role },
        expect.any(String), // JWT secret
        expect.any(Object)   // ExpiresIn option
      );
      expect(user).toBe(mockUser);
      expect(token).toBe('mocked-jwt-token');
    });

    it('should throw ApiError for invalid credentials (user not found)', async () => {
      User.findOne.mockResolvedValue(null);
      await expect(authService.loginUser('nonexistent@example.com', 'password123')).rejects.toThrow(ApiError);
      await expect(authService.loginUser('nonexistent@example.com', 'password123')).rejects.toHaveProperty('statusCode', 401);
    });

    it('should throw ApiError for invalid credentials (password mismatch)', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      User.findOne.mockResolvedValue(mockUser);
      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(ApiError);
      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toHaveProperty('statusCode', 401);
    });
  });
});
```
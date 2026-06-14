```javascript
const authService = require('../../services/authService');
const { User } = require('../../models');
const { CustomError } = require('../../utils/errorHandler');
const jwt = require('jsonwebtoken');

jest.mock('../../models', () => ({
  User: {
    create: jest.fn(),
    findOne: jest.fn(),
    prototype: {
      comparePassword: jest.fn(),
    },
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-jwt-token'),
}));

describe('Auth Service - Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a user successfully', async () => {
      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      User.create.mockResolvedValue({ ...userData, id: 'some-uuid', role: 'user' });

      const user = await authService.registerUser(userData);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(user).toHaveProperty('id');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('user');
    });

    it('should throw an error if user creation fails', async () => {
      const userData = { username: 'failuser', email: 'fail@example.com', password: 'password123' };
      User.create.mockRejectedValue(new Error('Database error'));

      await expect(authService.registerUser(userData)).rejects.toThrow('Database error');
      expect(User.create).toHaveBeenCalledWith(userData);
    });
  });

  describe('loginUser', () => {
    it('should login a user and return a token', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = {
        id: 'user-id-1',
        username: 'testuser',
        email,
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.loginUser(email, password);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(password);
      expect(jwt.sign).toHaveBeenCalledWith({ id: mockUser.id, role: mockUser.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      expect(result).toEqual({ user: { id: 'user-id-1', username: 'testuser', email, role: 'user' }, token: 'mocked-jwt-token' });
    });

    it('should throw CustomError for invalid credentials (user not found)', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.loginUser('nonexistent@example.com', 'password')).rejects.toThrow(CustomError);
      await expect(authService.loginUser('nonexistent@example.com', 'password')).rejects.toHaveProperty('statusCode', 401);
    });

    it('should throw CustomError for invalid credentials (incorrect password)', async () => {
      const mockUser = {
        id: 'user-id-1',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      User.findOne.mockResolvedValue(mockUser);

      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(CustomError);
      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toHaveProperty('statusCode', 401);
      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
    });
  });
});
```

#### Integration Tests (Jest & Supertest - for API interaction with mocked services/DB)
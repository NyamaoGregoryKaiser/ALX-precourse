```javascript
const authService = require('../../src/services/authService');
const db = require('../../src/config/db');
const { hashPassword, comparePassword } = require('../../src/utils/crypt');
const { signToken, verifyToken } = require('../../src/utils/jwt');
const AppError = require('../../src/utils/appError');
const { v4: uuidv4 } = require('uuid');

// Mock external dependencies
jest.mock('../../src/config/db', () => ({
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn(),
  update: jest.fn().mockReturnThis(),
  transaction: jest.fn((callback) => callback({
    insert: jest.fn(),
    where: jest.fn().mockReturnThis(),
    update: jest.fn(),
  })), // Mock transaction
}));
jest.mock('../../src/utils/crypt');
jest.mock('../../src/utils/jwt');
jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('Auth Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Register User Tests ---
  describe('registerUser', () => {
    it('should successfully register a new user and return token', async () => {
      uuidv4.mockReturnValue('test-user-id');
      db.where.mockReturnThis(); // chainable
      db.first.mockResolvedValue(null); // No existing user
      hashPassword.mockResolvedValue('hashedpassword');
      db.insert.mockResolvedValue([1]); // Successful insert
      signToken.mockReturnValue('mock-jwt-token');

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        type: 'user',
      };

      const result = await authService.registerUser(userData);

      expect(db.where).toHaveBeenCalledWith({ email: userData.email });
      expect(db.first).toHaveBeenCalled();
      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-user-id',
        name: userData.name,
        email: userData.email,
        password: 'hashedpassword',
        type: 'user',
      }));
      expect(signToken).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-user-id',
        type: 'user',
      }));
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw AppError if user with email already exists', async () => {
      db.where.mockReturnThis();
      db.first.mockResolvedValue({ id: 'existing-id', email: 'test@example.com' }); // User exists

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(AppError);
      await expect(authService.registerUser(userData)).rejects.toHaveProperty('statusCode', 409);
      expect(db.insert).not.toHaveBeenCalled();
      expect(signToken).not.toHaveBeenCalled();
    });

    it('should create a merchant entry if user type is "merchant"', async () => {
      uuidv4.mockImplementationOnce(() => 'merchant-user-id').mockImplementationOnce(() => 'merchant-id');
      db.where.mockReturnThis();
      db.first.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashedpassword');
      db.insert.mockResolvedValue([1]); // user insert
      signToken.mockReturnValue('mock-jwt-token');

      const userData = {
        name: 'Test Merchant',
        email: 'merchant@example.com',
        password: 'password123',
        type: 'merchant',
      };

      const result = await authService.registerUser(userData);

      // Check user insert
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'merchant-user-id',
        type: 'merchant',
      }));
      // Check merchant insert (second call to db.insert)
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'merchant-id',
        user_id: 'merchant-user-id',
        name: "Test Merchant's Merchant Account",
      }));
      // Check user update to link merchant_id
      expect(db.where).toHaveBeenCalledWith({ id: 'merchant-user-id' });
      expect(db.update).toHaveBeenCalledWith({ merchant_id: 'merchant-id' });
      expect(result).toHaveProperty('user');
      expect(result.user.type).toBe('merchant');
    });
  });

  // --- Login User Tests ---
  describe('loginUser', () => {
    it('should successfully log in an existing user and return token', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        type: 'user',
        status: 'active',
      };
      db.where.mockReturnThis();
      db.first.mockResolvedValue(user);
      comparePassword.mockResolvedValue(true);
      signToken.mockReturnValue('mock-jwt-token');

      const result = await authService.loginUser(user.email, 'password123');

      expect(db.where).toHaveBeenCalledWith({ email: user.email });
      expect(comparePassword).toHaveBeenCalledWith('password123', user.password);
      expect(signToken).toHaveBeenCalledWith(expect.objectContaining({
        id: user.id,
        type: user.type,
      }));
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw AppError for invalid credentials (user not found)', async () => {
      db.where.mockReturnThis();
      db.first.mockResolvedValue(null); // User not found

      await expect(authService.loginUser('nonexistent@example.com', 'password123'))
        .rejects.toThrow(AppError);
      await expect(authService.loginUser('nonexistent@example.com', 'password123'))
        .rejects.toHaveProperty('statusCode', 401);
      expect(comparePassword).not.toHaveBeenCalled();
      expect(signToken).not.toHaveBeenCalled();
    });

    it('should throw AppError for invalid credentials (incorrect password)', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        type: 'user',
        status: 'active',
      };
      db.where.mockReturnThis();
      db.first.mockResolvedValue(user);
      comparePassword.mockResolvedValue(false); // Incorrect password

      await expect(authService.loginUser(user.email, 'wrongpassword'))
        .rejects.toThrow(AppError);
      await expect(authService.loginUser(user.email, 'wrongpassword'))
        .rejects.toHaveProperty('statusCode', 401);
      expect(comparePassword).toHaveBeenCalledWith('wrongpassword', user.password);
      expect(signToken).not.toHaveBeenCalled();
    });

    it('should throw AppError if user account is inactive', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        type: 'user',
        status: 'inactive', // Inactive account
      };
      db.where.mockReturnThis();
      db.first.mockResolvedValue(user);
      comparePassword.mockResolvedValue(true);

      await expect(authService.loginUser(user.email, 'password123'))
        .rejects.toThrow(AppError);
      await expect(authService.loginUser(user.email, 'password123'))
        .rejects.toHaveProperty('statusCode', 401);
      expect(signToken).not.toHaveBeenCalled();
    });
  });
});
```
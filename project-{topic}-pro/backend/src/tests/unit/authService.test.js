const authService = require('../../services/authService');
const User = require('../../database/models/User');
const { ApiError } = require('../../middlewares/errorMiddleware');
const httpStatus = require('http-status');
const db = require('../../database/connection'); // Used for cleanup

describe('Auth Service', () => {
  // Clear users table before each test to ensure isolation
  beforeEach(async () => {
    await db('users').del();
  });

  describe('registerUser', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      const user = await authService.registerUser(userData.username, userData.email, userData.password);

      expect(user).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBeUndefined(); // Password should not be returned
      const storedUser = await User.findByUsername(userData.username);
      expect(storedUser).toBeDefined();
      expect(await User.comparePassword(userData.password, storedUser.password)).toBe(true);
    });

    test('should throw ApiError if username already taken', async () => {
      const userData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
      };
      await authService.registerUser(userData.username, userData.email, userData.password);

      await expect(
        authService.registerUser(userData.username, 'another@example.com', 'newpassword')
      ).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Username already taken'));
    });
  });

  describe('loginUser', () => {
    let testUser;
    beforeEach(async () => {
      // Create a user for login tests
      testUser = await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'loginpassword',
      });
    });

    test('should log in a user successfully with correct credentials', async () => {
      const user = await authService.loginUser('loginuser', 'loginpassword');
      expect(user).toBeDefined();
      expect(user.username).toBe('loginuser');
      expect(user.email).toBe('login@example.com');
      expect(user.password).toBeDefined(); // Password hash is returned by model, but we don't return it in API
    });

    test('should throw ApiError for invalid username', async () => {
      await expect(
        authService.loginUser('nonexistent', 'loginpassword')
      ).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials'));
    });

    test('should throw ApiError for incorrect password', async () => {
      await expect(
        authService.loginUser('loginuser', 'wrongpassword')
      ).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials'));
    });
  });

  describe('generateAuthTokens', () => {
    test('should generate a valid JWT token', () => {
      const userId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; // Example UUID
      const { token } = authService.generateAuthTokens(userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Optionally, verify the token structure (not full validation)
      const parts = token.split('.');
      expect(parts.length).toBe(3);
    });
  });
});
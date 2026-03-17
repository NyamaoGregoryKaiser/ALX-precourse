```javascript
const authService = require('../../src/services/authService');
const db = require('../../src/database');
const { AppError } = require('../../src/utils/appError');
const { generateAuthTokens, verifyToken } = require('../../src/utils/jwt');
const bcrypt = require('bcryptjs');

// Mock external dependencies if needed, e.g., jwt for simpler token verification
jest.mock('../../src/utils/jwt', () => ({
  generateAuthTokens: jest.fn(() => ({
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken'
  })),
  verifyToken: jest.fn(),
}));

// Mock logger to prevent excessive console output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('AuthService Unit Tests', () => {
  let newUserPayload, existingUser;

  beforeEach(async () => {
    // Clean and re-seed the DB before each test for isolation
    await db.sequelize.sync({ force: true }); // Ensure clean tables
    const { up: seedUp } = require('../../src/database/seeders/YYYYMMDDHHMMSS-initial-data');
    await seedUp(db.sequelize.queryInterface, db.sequelize.Sequelize);

    newUserPayload = {
      username: 'testuser_new',
      email: 'new@example.com',
      password: 'password123',
      role: 'user',
    };
    existingUser = await db.User.findOne({ where: { email: 'admin@example.com' } });
    
    // Reset mocks before each test
    generateAuthTokens.mockClear();
    verifyToken.mockClear();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const result = await authService.register(newUserPayload);

      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user.email).toBe(newUserPayload.email);
      expect(result.user).not.toHaveProperty('password'); // Password should be excluded
      expect(result).toHaveProperty('accessToken', 'mockAccessToken');
      expect(result).toHaveProperty('refreshToken', 'mockRefreshToken');

      const savedUser = await db.User.scope('withRefreshToken').findByPk(result.user.id);
      expect(savedUser.refreshToken).toBe('mockRefreshToken'); // Refresh token should be saved
      expect(generateAuthTokens).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError if email already exists', async () => {
      newUserPayload.email = 'admin@example.com'; // Use an existing email
      await expect(authService.register(newUserPayload)).rejects.toThrow(
        new AppError('User with this email already exists.', 409)
      );
    });

    it('should throw AppError if username already exists', async () => {
      newUserPayload.username = 'admin'; // Use an existing username
      await expect(authService.register(newUserPayload)).rejects.toThrow(
        new AppError('User with this username already exists.', 409)
      );
    });

    it('should hash password before saving', async () => {
      const originalPassword = newUserPayload.password;
      const result = await authService.register(newUserPayload);
      const userInDb = await db.User.scope('withPassword').findByPk(result.user.id);
      expect(await bcrypt.compare(originalPassword, userInDb.password)).toBe(true);
    });
  });

  describe('login', () => {
    it('should log in an existing user and return tokens', async () => {
      const result = await authService.login('admin@example.com', 'admin123');

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('admin@example.com');
      expect(result.user).not.toHaveProperty('password');
      expect(result).toHaveProperty('accessToken', 'mockAccessToken');
      expect(result).toHaveProperty('refreshToken', 'mockRefreshToken');

      const loggedInUser = await db.User.scope('withRefreshToken').findByPk(result.user.id);
      expect(loggedInUser.refreshToken).toBe('mockRefreshToken');
      expect(loggedInUser.lastLogin).not.toBeNull();
      expect(generateAuthTokens).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError for invalid credentials (wrong password)', async () => {
      await expect(authService.login('admin@example.com', 'wrongpassword')).rejects.toThrow(
        new AppError('Invalid credentials.', 401)
      );
    });

    it('should throw AppError for invalid credentials (non-existent email)', async () => {
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        new AppError('Invalid credentials.', 401)
      );
    });

    it('should throw AppError if account is not activated', async () => {
      // Create a deactivated user
      const deactivatedUser = await db.User.create({
        username: 'deactivated',
        email: 'deactivated@example.com',
        password: 'password123',
        role: 'user',
        isActivated: false,
      });

      await expect(authService.login('deactivated@example.com', 'password123')).rejects.toThrow(
        new AppError('Account is not activated.', 403)
      );
    });
  });

  describe('logout', () => {
    let loggedInUser;
    beforeEach(async () => {
      const loginResult = await authService.login('admin@example.com', 'admin123');
      loggedInUser = loginResult.user;
      // Manually set mock refresh token for logout test
      await db.User.update({ refreshToken: 'mockRefreshToken' }, { where: { id: loggedInUser.id } });
    });

    it('should successfully log out a user by clearing refresh token', async () => {
      const result = await authService.logout(loggedInUser.id, 'mockRefreshToken');
      expect(result).toBe(true);

      const userAfterLogout = await db.User.scope('withRefreshToken').findByPk(loggedInUser.id);
      expect(userAfterLogout.refreshToken).toBeNull();
    });

    it('should throw AppError if user not found', async () => {
      await expect(authService.logout('nonexistent-uuid', 'mockRefreshToken')).rejects.toThrow(
        new AppError('User not found.', 404)
      );
    });

    it('should throw AppError if provided refresh token does not match', async () => {
      await expect(authService.logout(loggedInUser.id, 'wrongRefreshToken')).rejects.toThrow(
        new AppError('Invalid refresh token for this user.', 401)
      );
    });
  });

  describe('refreshAccessToken', () => {
    let loggedInUser;
    beforeEach(async () => {
      const loginResult = await authService.login('testuser@example.com', 'user123');
      loggedInUser = loginResult.user;
      // Manually set mock refresh token for refresh test
      await db.User.update({ refreshToken: 'validRefreshToken' }, { where: { id: loggedInUser.id } });
      generateAuthTokens.mockImplementationOnce(() => ({
        accessToken: 'newMockAccessToken',
        refreshToken: 'newMockRefreshToken'
      }));
    });

    it('should generate new access and refresh tokens for a valid refresh token', async () => {
      const result = await authService.refreshAccessToken('validRefreshToken');

      expect(result).toHaveProperty('accessToken', 'newMockAccessToken');
      expect(result).toHaveProperty('refreshToken', 'newMockRefreshToken');

      const userAfterRefresh = await db.User.scope('withRefreshToken').findByPk(loggedInUser.id);
      expect(userAfterRefresh.refreshToken).toBe('newMockRefreshToken'); // New refresh token should be saved
      expect(generateAuthTokens).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError for an invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalidRefreshToken')).rejects.toThrow(
        new AppError('Invalid or expired refresh token. Please log in again.', 403)
      );
    });
  });
});
```
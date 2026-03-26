```javascript
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const { User } = require('../../src/models');
const authService = require('../../src/services/auth.service');
const ApiError = require('../../src/utils/ApiError');
const setupTestDB = require('../jest.setup'); // Using setupTestDB for a clean DB per test file if needed

// Mock sequelize models for unit testing services in isolation
// This is an alternative to using a real database and `setupTestDB` for pure unit tests
// For this example, we'll keep `setupTestDB` and interact with real models to demonstrate integration.
// If purely mocking:
// jest.mock('../../src/models', () => ({
//   User: {
//     scope: jest.fn().mockReturnThis(),
//     findOne: jest.fn(),
//   },
// }));


describe('Auth Service', () => {
  let newUser;
  let hashedPassword;

  beforeAll(async () => {
    await setupTestDB(); // Initialize a clean database for this test suite
    hashedPassword = await bcrypt.hash('Password123', 10);
    newUser = {
      name: 'Test User',
      email: 'testauth@example.com',
      password: hashedPassword, // Store hashed password directly
      role: 'user',
    };
  });

  afterEach(async () => {
    // Clean up any users created during tests
    await User.destroy({ where: { email: 'testauth@example.com' } });
  });

  describe('loginUserWithEmailAndPassword', () => {
    it('should return user object if email and password are correct', async () => {
      // Create a user directly using the model
      const user = await User.create({ ...newUser, password: 'Password123' }); // Pass plain text to model, it will hash

      const loggedInUser = await authService.loginUserWithEmailAndPassword(user.email, 'Password123');
      expect(loggedInUser).toBeDefined();
      expect(loggedInUser.email).toBe(user.email);
      // Ensure password is not returned in the default scope
      expect(loggedInUser).not.toHaveProperty('password');
    });

    it('should throw Unauthorized error if email not found', async () => {
      await expect(authService.loginUserWithEmailAndPassword('nonexistent@example.com', 'password'))
        .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
    });

    it('should throw Unauthorized error if password is incorrect', async () => {
      const user = await User.create({ ...newUser, email: 'wrongpass@example.com', password: 'CorrectPassword1' });
      await expect(authService.loginUserWithEmailAndPassword(user.email, 'WrongPassword2'))
        .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
    });
  });
});
```
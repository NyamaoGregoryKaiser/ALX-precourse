```javascript
const { User, sequelize } = require('../../src/models');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

describe('User model', () => {
  beforeAll(async () => {
    // Ensure test database is clean before running tests
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    // Clean up after each test
    await User.destroy({ truncate: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User creation', () => {
    test('should correctly validate a valid user', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password@123',
        role: 'viewer',
      };
      const user = await User.create(newUser);

      expect(user).toBeDefined();
      expect(user.username).toBe(newUser.username);
      expect(user.email).toBe(newUser.email);
      expect(user.role).toBe(newUser.role);
      expect(user.isEmailVerified).toBe(false); // Default value
      expect(await bcrypt.compare(newUser.password, user.password)).toBe(true);
    });

    test('should throw validation error if email is invalid', async () => {
      await expect(
        User.create({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password@123',
        })
      ).rejects.toThrow('Invalid email format');
    });

    test('should throw validation error if password is too short', async () => {
      await expect(
        User.create({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Pass1',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    test('should hash password automatically before saving', async () => {
      const newUser = {
        username: 'hashuser',
        email: 'hash@example.com',
        password: 'Password@123',
      };
      const user = await User.create(newUser);
      expect(user.password).not.toBe(newUser.password); // Should be hashed
    });

    test('should not allow duplicate emails', async () => {
      const user1 = { username: 'user1', email: 'duplicate@example.com', password: 'Password@123' };
      const user2 = { username: 'user2', email: 'duplicate@example.com', password: 'Password@123' };

      await User.create(user1);
      await expect(User.create(user2)).rejects.toThrow('Validation error'); // Unique constraint error
    });

    test('should not allow duplicate usernames', async () => {
      const user1 = { username: 'duplicateuser', email: 'user1@example.com', password: 'Password@123' };
      const user2 = { username: 'duplicateuser', email: 'user2@example.com', password: 'Password@123' };

      await User.create(user1);
      await expect(User.create(user2)).rejects.toThrow('Validation error'); // Unique constraint error
    });
  });

  describe('User instance methods', () => {
    let user;
    const password = 'Password@123';

    beforeEach(async () => {
      user = await User.create({
        username: 'instanceuser',
        email: 'instance@example.com',
        password: password,
      });
    });

    test('isPasswordMatch should return true if passwords match', async () => {
      expect(await user.isPasswordMatch(password)).toBe(true);
    });

    test('isPasswordMatch should return false if passwords do not match', async () => {
      expect(await user.isPasswordMatch('wrongpassword')).toBe(false);
    });

    test('toJSON should exclude password', () => {
      const userObject = user.toJSON();
      expect(userObject).not.toHaveProperty('password');
      expect(userObject).toHaveProperty('id');
      expect(userObject).toHaveProperty('email');
    });
  });

  describe('User static methods', () => {
    const userBody = {
      username: 'staticuser',
      email: 'static@example.com',
      password: 'Password@123',
    };
    let user;

    beforeEach(async () => {
      user = await User.create(userBody);
    });

    test('isEmailTaken should return true if email is taken', async () => {
      expect(await User.isEmailTaken(userBody.email)).toBe(true);
    });

    test('isEmailTaken should return false if email is not taken', async () => {
      expect(await User.isEmailTaken('new@example.com')).toBe(false);
    });

    test('isEmailTaken should return false if email is taken by excluded user', async () => {
      expect(await User.isEmailTaken(userBody.email, user.id)).toBe(false);
    });

    test('isUsernameTaken should return true if username is taken', async () => {
      expect(await User.isUsernameTaken(userBody.username)).toBe(true);
    });

    test('isUsernameTaken should return false if username is not taken', async () => {
      expect(await User.isUsernameTaken('newusername')).toBe(false);
    });

    test('isUsernameTaken should return false if username is taken by excluded user', async () => {
      expect(await User.isUsernameTaken(userBody.username, user.id)).toBe(false);
    });
  });
});
```
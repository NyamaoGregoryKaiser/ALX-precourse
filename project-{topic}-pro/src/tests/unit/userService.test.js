const UserService = require('../../services/userService');
const User = require('../../models/User');
const Account = require('../../models/Account');
const { knex } = require('../../utils/db');
const { v4: uuidv4 } = require('uuid');

// Mock `uuid` for consistent test IDs
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-abcd'),
}));

describe('UserService Unit Tests', () => {
  // Clear and re-run migrations before each test suite to ensure clean state
  beforeEach(async () => {
    await knex.migrate.rollback();
    await knex.migrate.latest();
  });

  afterEach(async () => {
    await knex.migrate.rollback(); // Rollback after each test
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user and a default account', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const newUser = await UserService.createUser(userData);

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe(userData.email);
      expect(newUser.firstName).toBe(userData.firstName);
      expect(newUser.id).toBe('mock-uuid-1234-abcd'); // Check mock uuid

      // Verify password is hashed (not plain text)
      expect(newUser.password).not.toBe(userData.password);
      expect(newUser.password).toMatch(/^\$2a\$\d{2}\$[./0-9A-Za-z]{53}$/); // Basic bcrypt hash regex

      // Verify a default account was created
      const account = await Account.query().findOne({ userId: newUser.id });
      expect(account).toBeDefined();
      expect(account.userId).toBe(newUser.id);
      expect(account.balance).toBe(0);
      expect(account.currency).toBe('NGN');
      expect(account.accountNumber).toMatch(/^ACC-\d{13}-[A-Z0-9]{6}$/); // Check format
    });

    it('should throw an error if user with email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      };
      await UserService.createUser(userData); // Create first user

      await expect(UserService.createUser(userData)).rejects.toThrow('User with this email already exists.');
    });

    it('should throw an error for invalid input (e.g., missing email)', async () => {
        const userData = {
            password: 'password123',
            firstName: 'Invalid',
            lastName: 'User',
        };
        // Assuming validation happens higher up or in Joi schema.
        // For service, we'd expect an error from the model or database constraint.
        await expect(UserService.createUser(userData)).rejects.toThrow('Failed to create user.');
    });
  });

  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: 'password123',
        firstName: 'Find',
        lastName: 'Id',
      };
      const createdUser = await UserService.createUser(userData);

      const foundUser = await UserService.findUserById(createdUser.id);
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.password).toBeDefined(); // Password field exists
      expect(foundUser.password).not.toBe(userData.password); // Is hashed
    });

    it('should return null if user not found by ID', async () => {
      const foundUser = await UserService.findUserById(uuidv4()); // Non-existent UUID
      expect(foundUser).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      const userData = {
        email: 'findbyemail@example.com',
        password: 'password123',
        firstName: 'Find',
        lastName: 'Email',
      };
      const createdUser = await UserService.createUser(userData);

      const foundUser = await UserService.findUserByEmail(userData.email);
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(userData.email);
    });

    it('should return null if user not found by email', async () => {
      const foundUser = await UserService.findUserByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const userData = {
        email: 'update@example.com',
        password: 'password123',
        firstName: 'Original',
        lastName: 'Name',
      };
      const createdUser = await UserService.createUser(userData);

      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
      };
      const updatedUser = await UserService.updateUser(createdUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(createdUser.id);
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('User');
      expect(updatedUser.email).toBe(createdUser.email); // Email should remain unchanged if not in updateData
    });

    it('should return null if user to update is not found', async () => {
      const updateData = { firstName: 'NonExistent' };
      await expect(UserService.updateUser(uuidv4(), updateData)).rejects.toThrow('User not found.');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userData = {
        email: 'delete@example.com',
        password: 'password123',
        firstName: 'Delete',
        lastName: 'Me',
      };
      const createdUser = await UserService.createUser(userData);

      const deletedCount = await UserService.deleteUser(createdUser.id);
      expect(deletedCount).toBe(1);

      const foundUser = await UserService.findUserById(createdUser.id);
      expect(foundUser).toBeNull();

      // Ensure associated accounts are also deleted (due to CASCADE)
      const accounts = await Account.query().where({ userId: createdUser.id });
      expect(accounts).toEqual([]);
    });

    it('should throw an error if user to delete is not found', async () => {
      await expect(UserService.deleteUser(uuidv4())).rejects.toThrow('User not found.');
    });
  });
});
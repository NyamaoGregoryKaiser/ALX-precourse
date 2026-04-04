```javascript
const authService = require('../../src/services/authService');
const userRepository = require('../../src/repositories/userRepository');
const AppError = require('../../src/utils/appError');
const bcrypt = require('bcryptjs');
const { signToken } = require('../../src/utils/jwt');

// Mock external dependencies
jest.mock('../../src/repositories/userRepository');
jest.mock('bcryptjs');
jest.mock('../../src/utils/jwt');

describe('Auth Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      const hashedPassword = 'hashedpassword';
      const newUser = { id: 'user123', ...userData, password: hashedPassword, role: 'USER' };
      const token = 'mocktoken';

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      userRepository.create.mockResolvedValue(newUser);
      signToken.mockReturnValue(token);

      const result = await authService.register(userData);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: 'USER',
      });
      expect(signToken).toHaveBeenCalledWith(newUser.id);
      expect(result).toEqual({ user: newUser, token });
    });

    it('should throw AppError if email is already registered', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue({ id: 'existingUser' });

      await expect(authService.register(userData)).rejects.toThrow(
        new AppError('Email already registered.', 409)
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(userRepository.findByUsername).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(signToken).not.toHaveBeenCalled();
    });

    it('should throw AppError if username is already taken', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue({ id: 'existingUser' });

      await expect(authService.register(userData)).rejects.toThrow(
        new AppError('Username already taken.', 409)
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(signToken).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should log in a user successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedpassword';
      const user = { id: 'user123', email, password: hashedPassword, role: 'USER' };
      const userWithoutPassword = { id: 'user123', email, role: 'USER' };
      const token = 'mocktoken';

      userRepository.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      signToken.mockReturnValue(token);

      const result = await authService.login(email, password);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(email, true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(signToken).toHaveBeenCalledWith(user.id);
      expect(result).toEqual({ user: userWithoutPassword, token });
    });

    it('should throw AppError if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(
        new AppError('Incorrect email or password.', 401)
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email, true);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(signToken).not.toHaveBeenCalled();
    });

    it('should throw AppError if password is incorrect', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const hashedPassword = 'hashedpassword';
      const user = { id: 'user123', email, password: hashedPassword, role: 'USER' };

      userRepository.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow(
        new AppError('Incorrect email or password.', 401)
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email, true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(signToken).not.toHaveBeenCalled();
    });
  });
});
```
import { AuthService } from '../../src/auth/auth.service';
import { AppDataSource } from '../../src/database/data-source';
import { User } from '../../src/database/entities/User';
import { CustomError } from '../../src/utils/error';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config'; // Mock this for tests

// Mock TypeORM repository
const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
};

// Mock AppDataSource to return our mock repository
jest.mock('../../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockUserRepository),
  },
}));

// Mock bcrypt for password hashing/validation
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => Promise.resolve('mockSalt')),
  hash: jest.fn(() => Promise.resolve('hashedPassword123')),
  compare: jest.fn((plain, hashed) => Promise.resolve(plain === 'password123' && hashed === 'hashedPassword123')),
}));

// Mock config for JWT secret
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test_jwt_secret',
    jwtExpiresIn: '1h',
  },
}));

describe('AuthService Unit Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    (jwt.sign as jest.Mock) = jest.fn(() => 'mockAccessToken'); // Mock jwt.sign
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        isNew: true, // Simulate TypeORM entity behavior for BeforeInsert hook
        setModified: jest.fn(), // Mock the setModified method
        isModified: jest.fn(() => true), // Always true for new password
        hashPassword: User.prototype.hashPassword // Use actual hashPassword method
      });
      mockUserRepository.save.mockImplementation((user) => Promise.resolve({ ...user, password: 'hashedPassword123' }));

      const user = await authService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('hashedPassword123'); // Should be hashed
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw CustomError if username already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ username: 'existinguser', email: 'other@example.com' });

      await expect(
        authService.register({ username: 'existinguser', email: 'new@example.com', password: 'password123' }),
      ).rejects.toThrow(CustomError);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw CustomError if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ username: 'otheruser', email: 'existing@example.com' });

      await expect(
        authService.register({ username: 'newuser', email: 'existing@example.com', password: 'password123' }),
      ).rejects.toThrow(CustomError);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return a JWT token on successful login', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword123',
        username: 'testuser',
        validatePassword: jest.fn(() => Promise.resolve(true)), // Mock validatePassword
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const token = await authService.login({ email: 'test@example.com', password: 'password123' });

      expect(token).toBe('mockAccessToken');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUser.validatePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user1', email: 'test@example.com' },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn },
      );
    });

    it('should throw CustomError for invalid email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'password123' }),
      ).rejects.toThrow(CustomError);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw CustomError for invalid password', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword123',
        username: 'testuser',
        validatePassword: jest.fn(() => Promise.resolve(false)), // Mock validatePassword to return false
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(CustomError);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUser.validatePassword).toHaveBeenCalledWith('wrongpassword');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should return user if found', async () => {
      const mockUser = { id: 'user1', username: 'testuser', email: 'test@example.com' } as User;
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const user = await authService.findUserById('user1');
      expect(user).toEqual(mockUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'user1' });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const user = await authService.findUserById('nonexistent');
      expect(user).toBeNull();
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
    });
  });
});
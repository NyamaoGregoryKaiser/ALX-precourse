```typescript
import 'reflect-metadata';
import { AppDataSource } from '../../data-source';
import AuthService from '../auth.service';
import { User } from '../../models/User.entity';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../../utils/appError';
import { Repository } from 'typeorm';

// Mock the TypeORM AppDataSource and User repository
// This prevents actual database calls during unit tests
jest.mock('../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    })),
    isInitialized: true, // Assume it's initialized for tests
  },
}));

// Mock bcrypt for password hashing/comparison
jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;

  beforeEach(() => {
    // Re-initialize service and mocks before each test
    authService = new AuthService();
    userRepository = AppDataSource.getRepository(User) as jest.Mocked<Repository<User>>;
    jest.clearAllMocks(); // Clear call counts and mock implementations
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      // Setup mock return values for repository methods and bcrypt
      (userRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      (userRepository.create as jest.Mock).mockReturnValue({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (userRepository.save as jest.Mock).mockResolvedValue({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const user = await authService.registerUser('testuser', 'test@example.com', 'password123');

      // Assertions to ensure correct methods were called with expected arguments
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: [{ email: 'test@example.com' }, { username: 'testuser' }] });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'member',
      }));
      expect(userRepository.save).toHaveBeenCalled();
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(user).toHaveProperty('password', 'hashedpassword'); // Ensure hashed password is set
    });

    it('should throw AppError if user with email or username already exists', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(new User()); // Simulate existing user

      // Assert that an AppError is thrown with a 409 status code
      await expect(authService.registerUser('existinguser', 'existing@example.com', 'password123'))
        .rejects.toThrow(AppError);
      await expect(authService.registerUser('existinguser', 'existing@example.com', 'password123'))
        .rejects.toHaveProperty('statusCode', 409);
      expect(userRepository.save).not.toHaveBeenCalled(); // Should not attempt to save
    });

    it('should throw AppError on database save failure', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockReturnValue({});
      (userRepository.save as jest.Mock).mockRejectedValue(new Error('Database connection failed')); // Simulate DB error
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      // Assert that an AppError is thrown with a 500 status code
      await expect(authService.registerUser('testuser', 'test@example.com', 'password123'))
        .rejects.toThrow(AppError);
      await expect(authService.registerUser('testuser', 'test@example.com', 'password123'))
        .rejects.toHaveProperty('statusCode', 500);
    });
  });

  describe('validateUser', () => {
    const mockUser = new User();
    mockUser.id = '123';
    mockUser.email = 'test@example.com';
    mockUser.password = 'hashedpassword'; // This needs to be the hashed version
    mockUser.username = 'testuser';
    mockUser.role = 'member';

    it('should return user if credentials are valid', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Password matches

      const user = await authService.validateUser('test@example.com', 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'username', 'email', 'password', 'role', 'createdAt', 'updatedAt'] // Ensure password is selected
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(user).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null); // No user found

      const user = await authService.validateUser('nonexistent@example.com', 'password123');

      expect(user).toBeNull();
    });

    it('should return null if password does not match', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password mismatch

      const user = await authService.validateUser('test@example.com', 'wrongpassword');

      expect(user).toBeNull();
    });
  });
});
```
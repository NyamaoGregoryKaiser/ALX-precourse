import { AppDataSource } from '../../src/config/database';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../dtos/auth.dto';
import { CustomError } from '../exceptions/custom.error';
import httpStatus from 'http-status-codes';

// Mock dependencies
jest.mock('typeorm', () => ({
  ...jest.requireActual('typeorm'),
  DataSource: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(null),
    getRepository: jest.fn((entity) => {
      // Mock repository for User
      if (entity === User) {
        return {
          findOneBy: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
          findOne: jest.fn(() => ({
            id: 'mock-user-id',
            username: 'testuser',
            email: 'test@example.com',
            password: 'hashedpassword', // Mock hashed password
            comparePassword: jest.fn().mockResolvedValue(true),
          })),
        };
      }
      return {};
    }),
    isInitialized: true,
    runMigrations: jest.fn().mockResolvedValue(null),
  })),
}));

jest.mock('../utils/jwt.util', () => ({
  generateToken: jest.fn(() => 'mock-jwt-token'),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let userRepository: any;

  beforeAll(async () => {
    // Re-initialize AppDataSource in a way that mocks its behavior for unit tests
    // This is a deep mock, you might prefer a simpler mock if testing only service logic
    AppDataSource.initialize(); // Call the mocked initialize
    userRepository = AppDataSource.getRepository(User);
    userService = new UserService();
    authService = new AuthService(userService); // Inject mocked UserService
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
      };

      userRepository.findOneBy.mockResolvedValue(null); // User not found
      userRepository.save.mockImplementation((user) => Promise.resolve({ ...user, id: 'some-uuid' }));

      const user = await authService.register(registerDto);

      expect(user).toBeDefined();
      expect(user.username).toBe(registerDto.username);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if username already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'existinguser',
        email: 'newuser@example.com',
        password: 'Password123!',
      };

      userRepository.findOneBy.mockImplementation((criteria: any) => {
        if (criteria.username === 'existinguser') {
          return Promise.resolve({ username: 'existinguser' }); // User exists
        }
        return Promise.resolve(null);
      });

      await expect(authService.register(registerDto)).rejects.toThrow(CustomError);
      await expect(authService.register(registerDto)).rejects.toHaveProperty('statusCode', httpStatus.CONFLICT);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if email already exists', async () => {
      const registerDto: RegisterDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      userRepository.findOneBy.mockImplementation((criteria: any) => {
        if (criteria.email === 'existing@example.com') {
          return Promise.resolve({ email: 'existing@example.com' }); // User exists
        }
        return Promise.resolve(null);
      });

      await expect(authService.register(registerDto)).rejects.toThrow(CustomError);
      await expect(authService.register(registerDto)).rejects.toHaveProperty('statusCode', httpStatus.CONFLICT);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return a token on successful login', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const { token, user } = await authService.login(loginDto);

      expect(token).toBe('mock-jwt-token');
      expect(user).toBeDefined();
      expect(user.email).toBe(loginDto.email);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email }, select: ['id', 'username', 'email', 'password', 'role'] });
      expect(userRepository.findOne().comparePassword).toHaveBeenCalledWith(loginDto.password);
    });

    it('should throw an error for invalid credentials', async () => {
      userRepository.findOne.mockResolvedValue(null); // User not found

      const loginDto = { email: 'nonexistent@example.com', password: 'wrongpassword' };
      await expect(authService.login(loginDto)).rejects.toThrow(CustomError);
      await expect(authService.login(loginDto)).rejects.toHaveProperty('statusCode', httpStatus.UNAUTHORIZED);
    });
  });
});
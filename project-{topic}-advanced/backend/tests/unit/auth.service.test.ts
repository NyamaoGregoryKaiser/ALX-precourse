```typescript
import { AuthService } from '../../src/services/auth.service';
import { UserRepository } from '../../src/repositories/User.repository';
import { User, UserRole } from '../../src/entities/User.entity';
import { AppDataSource } from '../../src/database/data-source';
import { hashPassword, comparePasswords } from '../../src/utils/password.utils';
import { generateJwtToken, verifyJwtToken } from '../../src/auth/jwt.utils';
import { ApiError } from '../../src/utils/api-error';
import { StatusCodes } from 'http-status-codes';

// Mock the AppDataSource and UserRepository
jest.mock('../../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({})), // Mock getRepository call
  },
}));

jest.mock('../../src/repositories/User.repository');
jest.mock('../../src/utils/password.utils');
jest.mock('../../src/auth/jwt.utils');

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository(AppDataSource.getRepository(User)) as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepository);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const mockUser = {
      id: 'uuid-123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashedpassword');
      mockUserRepository.create.mockReturnValue(mockUser as User); // Cast to User
      mockUserRepository.save.mockResolvedValue(mockUser as User);

      const result = await authService.registerUser('testuser', 'test@example.com', 'password123');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw ApiError if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as User);

      await expect(authService.registerUser('testuser', 'test@example.com', 'password123'))
        .rejects.toThrow(new ApiError(StatusCodes.CONFLICT, 'User with this email already exists.'));
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('should throw ApiError if username already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser as User);

      await expect(authService.registerUser('testuser', 'test@example.com', 'password123'))
        .rejects.toThrow(new ApiError(StatusCodes.CONFLICT, 'User with this username already exists.'));
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('loginUser', () => {
    const mockUserWithPassword = {
      id: 'uuid-123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword', // Make sure this is present for login logic
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUserWithoutPassword = { ...mockUserWithPassword };
    delete mockUserWithoutPassword.password; // Expected return value

    it('should log in a user successfully and return token', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUserWithPassword as User),
      } as any); // Cast to any to bypass type issues with chained methods
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateJwtToken as jest.Mock).mockReturnValue('mocked-jwt-token');

      const result = await authService.loginUser('test@example.com', 'password123');

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(comparePasswords).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(generateJwtToken).toHaveBeenCalledWith(mockUserWithPassword.id, mockUserWithPassword.role);
      expect(result).toEqual({ user: mockUserWithoutPassword, token: 'mocked-jwt-token' });
    });

    it('should throw ApiError if user not found', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(authService.loginUser('nonexistent@example.com', 'password123'))
        .rejects.toThrow(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials.'));
      expect(comparePasswords).not.toHaveBeenCalled();
    });

    it('should throw ApiError if password is incorrect', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUserWithPassword as User),
      } as any);
      (comparePasswords as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials.'));
      expect(comparePasswords).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
      expect(generateJwtToken).not.toHaveBeenCalled();
    });
  });
});
```
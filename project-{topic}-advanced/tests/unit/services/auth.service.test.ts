```typescript
import { AuthService } from '../../../src/services/auth.service';
import { AppDataSourceInstance } from '../../../src/database';
import { User, UserRole } from '../../../src/database/entities/User';
import * as AuthUtils from '../../../src/utils/auth.utils';
import { CustomError } from '../../../src/interfaces/error.interface';

// Mock TypeORM repository
const mockUserRepository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// Mock AuthUtils
jest.mock('../../../src/utils/auth.utils', () => ({
  hashPassword: jest.fn(),
  comparePasswords: jest.fn(),
  generateToken: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    // Mock getRepository for the duration of these tests
    jest.spyOn(AppDataSourceInstance, 'getRepository').mockReturnValue(mockUserRepository as any);
    authService = new AuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null); // No existing user
      (AuthUtils.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue({ id: 'user1', email: 'test@example.com', role: UserRole.USER });
      mockUserRepository.save.mockResolvedValue({ id: 'user1', email: 'test@example.com', role: UserRole.USER });
      (AuthUtils.generateToken as jest.Mock).mockReturnValue('mockToken');

      const result = await authService.register('test@example.com', 'password123');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(AuthUtils.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedPassword',
        role: UserRole.USER,
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(AuthUtils.generateToken).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({
        user: { id: 'user1', email: 'test@example.com', role: UserRole.USER },
        token: 'mockToken',
      });
    });

    it('should throw CustomError if user already exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ email: 'existing@example.com' });

      await expect(authService.register('existing@example.com', 'password123')).rejects.toThrow(
        new CustomError(409, 'User with this email already exists.')
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'existing@example.com' });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should log in a user successfully', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com', password: 'hashedPassword', role: UserRole.USER };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      (AuthUtils.comparePasswords as jest.Mock).mockResolvedValue(true);
      (AuthUtils.generateToken as jest.Mock).mockReturnValue('mockToken');

      const result = await authService.login('test@example.com', 'password123');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(AuthUtils.comparePasswords).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(AuthUtils.generateToken).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ user: mockUser, token: 'mockToken' });
    });

    it('should throw CustomError for invalid credentials (user not found)', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        new CustomError(401, 'Invalid credentials.')
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(AuthUtils.comparePasswords).not.toHaveBeenCalled();
    });

    it('should throw CustomError for invalid credentials (incorrect password)', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com', password: 'hashedPassword', role: UserRole.USER };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      (AuthUtils.comparePasswords as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        new CustomError(401, 'Invalid credentials.')
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(AuthUtils.comparePasswords).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
    });
  });

  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com', password: 'hashedPassword', role: UserRole.USER };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await authService.findUserById('user1');
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'user1' });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await authService.findUserById('nonexistentId');
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistentId' });
      expect(result).toBeNull();
    });
  });
});
```
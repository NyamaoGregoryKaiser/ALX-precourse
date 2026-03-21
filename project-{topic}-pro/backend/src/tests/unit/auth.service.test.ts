```typescript
import 'reflect-metadata';
import { getRepository } from 'typeorm';
import { User, UserRole } from '@models/User';
import authService from '@services/auth.service';
import * as passwordUtils from '@utils/password';
import * as jwtUtils from '@utils/jwt';
import AppError, { ErrorType } from '@utils/AppError';

// Mock TypeORM repository
jest.mock('typeorm', () => ({
  ...jest.requireActual('typeorm'),
  getRepository: jest.fn(() => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  })),
}));

// Mock utility functions
jest.mock('@utils/password');
jest.mock('@utils/jwt');
jest.mock('@config/logger'); // Silence logger for unit tests

const mockGetRepository = getRepository as jest.Mock;
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    mockGetRepository.mockReturnValue(mockUserRepository);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue({
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        password: 'hashedPassword',
      });
      mockUserRepository.save.mockResolvedValue({
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        password: 'hashedPassword',
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('accessToken');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refreshToken');

      const result = await authService.register('testuser', 'test@example.com', 'password123', UserRole.USER);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: [{ email: 'test@example.com' }, { username: 'testuser' }] });
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: UserRole.USER,
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(jwtUtils.generateAccessToken).toHaveBeenCalledWith({ id: 'user-uuid', role: UserRole.USER });
      expect(jwtUtils.generateRefreshToken).toHaveBeenCalledWith({ id: 'user-uuid', role: UserRole.USER });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'accessToken');
      expect(result).toHaveProperty('refreshToken', 'refreshToken');
    });

    it('should throw AppError if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ email: 'test@example.com' }); // User exists

      await expect(authService.register('testuser', 'test@example.com', 'password123', UserRole.USER)).rejects.toThrow(
        new AppError('User with that email or username already exists.', ErrorType.CONFLICT)
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully log in a user', async () => {
      const mockUser = {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        password: 'hashedPassword',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('accessToken');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refreshToken');

      const result = await authService.login('test@example.com', 'password123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(passwordUtils.comparePassword).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toHaveProperty('user', mockUser);
      expect(result).toHaveProperty('accessToken', 'accessToken');
      expect(result).toHaveProperty('refreshToken', 'refreshToken');
    });

    it('should throw AppError for invalid credentials (user not found)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // User not found

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        new AppError('Invalid credentials.', ErrorType.UNAUTHORIZED)
      );
    });

    it('should throw AppError for invalid credentials (incorrect password)', async () => {
      const mockUser = {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        password: 'hashedPassword',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false); // Incorrect password

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        new AppError('Invalid credentials.', ErrorType.UNAUTHORIZED)
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh an access token', async () => {
      const mockDecoded = { id: 'user-uuid', role: UserRole.USER };
      const mockUser = { id: 'user-uuid', role: UserRole.USER };
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(mockDecoded);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('newAccessToken');

      const result = await authService.refreshAccessToken('refreshToken');

      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith('refreshToken');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid' } });
      expect(jwtUtils.generateAccessToken).toHaveBeenCalledWith({ id: 'user-uuid', role: UserRole.USER });
      expect(result).toHaveProperty('accessToken', 'newAccessToken');
    });

    it('should throw AppError if refresh token is invalid/expired', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new AppError('Invalid or expired refresh token', ErrorType.UNAUTHORIZED);
      });

      await expect(authService.refreshAccessToken('invalidToken')).rejects.toThrow(
        new AppError('Invalid or expired refresh token', ErrorType.UNAUTHORIZED)
      );
    });

    it('should throw AppError if user linked to refresh token is not found', async () => {
      const mockDecoded = { id: 'non-existent-user-uuid', role: UserRole.USER };
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(mockDecoded);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(authService.refreshAccessToken('validToken')).rejects.toThrow(
        new AppError('Invalid refresh token.', ErrorType.UNAUTHORIZED)
      );
    });
  });
});
```
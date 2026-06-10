```typescript
import { AppDataSource } from '../../src/database/config/data-source';
import { User, UserRole } from '../../src/database/entities/User';
import { AuthService } from '../../src/modules/auth/auth.service';
import * as bcrypt from 'bcryptjs';
import * as jwtUtils from '../../src/shared/utils/jwt.utils';
import { CustomError } from '../../src/shared/errors/CustomError';
import { Repository } from 'typeorm';

// Mock TypeORM DataSource and Repository
jest.mock('../../src/database/config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      })),
      create: jest.fn(),
      save: jest.fn(),
    })),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jwtUtils
jest.mock('../../src/shared/utils/jwt.utils', () => ({
  generateTokens: jest.fn(),
  verifyRefreshToken: jest.fn(),
  storeRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;

  beforeEach(() => {
    authService = new AuthService();
    userRepository = AppDataSource.getRepository(User);
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (userRepository.create as jest.Mock).mockReturnValue({ id: '1', ...registerDto, role: UserRole.USER, password: 'hashedPassword' });
      (userRepository.save as jest.Mock).mockResolvedValue({ id: '1', ...registerDto, role: UserRole.USER, password: 'hashedPassword' });

      const result = await authService.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: [{ username: registerDto.username }, { email: registerDto.email }] });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: registerDto.username,
        email: registerDto.email,
        password: 'hashedPassword',
        role: UserRole.USER,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', '1');
      expect(result.email).toBe(registerDto.email);
    });

    it('should throw CustomError if username already exists', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue({ username: registerDto.username });

      await expect(authService.register(registerDto)).rejects.toThrow(
        new CustomError('User with this username already exists', 409, { field: 'username' })
      );
    });

    it('should throw CustomError if email already exists', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue({ email: registerDto.email });

      await expect(authService.register(registerDto)).rejects.toThrow(
        new CustomError('User with this email already exists', 409, { field: 'email' })
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: UserRole.USER,
    };
    const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };

    it('should log in a user successfully and return tokens', async () => {
      (userRepository.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateTokens as jest.Mock).mockReturnValue(mockTokens);
      (jwtUtils.storeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.login(loginDto);

      expect(userRepository.createQueryBuilder().getOne).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(jwtUtils.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(jwtUtils.storeRefreshToken).toHaveBeenCalledWith(mockUser.id, mockTokens.refreshToken, expect.any(String));
      expect(result).toEqual({ accessToken: mockTokens.accessToken, refreshToken: mockTokens.refreshToken, user: mockUser });
    });

    it('should throw CustomError for invalid credentials (user not found)', async () => {
      (userRepository.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new CustomError('Invalid credentials', 401)
      );
    });

    it('should throw CustomError for invalid credentials (incorrect password)', async () => {
      (userRepository.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new CustomError('Invalid credentials', 401)
      );
    });
  });

  describe('refreshAccessToken', () => {
    const oldRefreshToken = 'old_refresh_token';
    const decodedPayload = { userId: '1', email: 'test@example.com', role: UserRole.USER };
    const mockUser = { id: '1', username: 'testuser', email: 'test@example.com', role: UserRole.USER };
    const newTokens = { accessToken: 'new_access', refreshToken: 'new_refresh' };

    it('should refresh access token successfully', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (jwtUtils.deleteRefreshToken as jest.Mock).mockResolvedValue(oldRefreshToken); // Simulate deletion returning the token
      (userRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
      (jwtUtils.generateTokens as jest.Mock).mockReturnValue(newTokens);
      (jwtUtils.storeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.refreshAccessToken(oldRefreshToken);

      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith(oldRefreshToken);
      expect(jwtUtils.deleteRefreshToken).toHaveBeenCalledWith(decodedPayload.userId);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: decodedPayload.userId });
      expect(jwtUtils.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(jwtUtils.storeRefreshToken).toHaveBeenCalledWith(decodedPayload.userId, newTokens.refreshToken, expect.any(String));
      expect(result).toEqual({ accessToken: newTokens.accessToken, newRefreshToken: newTokens.refreshToken });
    });

    it('should throw CustomError for invalid or expired refresh token (verification failed)', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      await expect(authService.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        new CustomError('Invalid or expired refresh token', 403)
      );
    });

    it('should throw CustomError if refresh token not found in store or mismatch', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (jwtUtils.deleteRefreshToken as jest.Mock).mockResolvedValue(null); // Simulate token not found

      await expect(authService.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        new CustomError('Invalid or revoked refresh token', 403)
      );
    });

    it('should throw CustomError if user not found', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue(decodedPayload);
      (jwtUtils.deleteRefreshToken as jest.Mock).mockResolvedValue(oldRefreshToken);
      (userRepository.findOneBy as jest.Mock).mockResolvedValue(null); // User not found

      await expect(authService.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        new CustomError('User not found', 404)
      );
    });
  });

  describe('logout', () => {
    it('should delete refresh token for the user', async () => {
      const userId = 'user123';
      await authService.logout(userId);
      expect(jwtUtils.deleteRefreshToken).toHaveBeenCalledWith(userId);
    });
  });
});
```
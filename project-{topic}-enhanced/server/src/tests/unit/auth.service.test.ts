import * as authService from '@/modules/auth/auth.service';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { UserRole } from '@/entities/UserRole';
import { RefreshToken } from '@/entities/RefreshToken';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import bcrypt from 'bcryptjs';
import * as jwtUtils from '@/utils/jwt';
import { getRedisClient } from '@/config/redis';
import { clearDb } from '../setup';

// Mock TypeORM repositories
const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
};

const mockRoleRepository = {
  findOneBy: jest.fn(),
  findBy: jest.fn(),
};

const mockUserRoleRepository = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockRefreshTokenRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
};

// Mock Redis client
const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
  isReady: true, // Simulate being connected
};

jest.mock('@/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      if (entity === User) return mockUserRepository;
      if (entity === Role) return mockRoleRepository;
      if (entity === UserRole) return mockUserRoleRepository;
      if (entity === RefreshToken) return mockRefreshTokenRepository;
      return {};
    }),
  },
}));

jest.mock('@/config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashedPassword123')),
  compare: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/utils/jwt', () => ({
  generateAccessToken: jest.fn(() => 'mockAccessToken'),
  generateRefreshToken: jest.fn(() => 'mockRefreshToken'),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate Redis client being connected for each test
    mockRedisClient.isReady = true;
  });

  describe('registerUser', () => {
    it('should successfully register a new user with default role', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // No existing email/username
      mockUserRepository.create.mockReturnValue({
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword123',
        isEmailVerified: false,
      });
      mockUserRepository.save.mockImplementation(user => Promise.resolve(user));
      mockRoleRepository.findOneBy.mockResolvedValue({ id: 'role1', name: 'user' });
      mockUserRoleRepository.create.mockReturnValue({ userId: 'user1', roleId: 'role1' });
      mockUserRoleRepository.save.mockResolvedValue([{ userId: 'user1', roleId: 'role1', role: { name: 'user' } }]);

      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const user = await authService.registerUser(userData);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockRoleRepository.findOneBy).toHaveBeenCalledWith({ name: 'user' });
      expect(mockUserRoleRepository.save).toHaveBeenCalled();
      expect(user).toHaveProperty('id', 'user1');
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(user.userRoles[0].role.name).toBe('user');
    });

    it('should throw ApiError if email is already taken', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce({ id: 'user1', email: 'test@example.com' });

      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      await expect(authService.registerUser(userData)).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Email already taken'));
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ApiError if username is already taken', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null); // Email not taken
      mockUserRepository.findOneBy.mockResolvedValueOnce({ id: 'user1', username: 'testuser' }); // Username taken

      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      await expect(authService.registerUser(userData)).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Username already taken'));
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should successfully register a new user with specified roles', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // No existing email/username
      mockUserRepository.create.mockReturnValue({
        id: 'user2',
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'hashedPassword123',
        isEmailVerified: false,
      });
      mockUserRepository.save.mockImplementation(user => Promise.resolve(user));
      mockRoleRepository.findBy.mockResolvedValue([{ id: 'adminRole1', name: 'admin' }]);
      mockUserRoleRepository.create.mockReturnValue({ userId: 'user2', roleId: 'adminRole1' });
      mockUserRoleRepository.save.mockResolvedValue([{ userId: 'user2', roleId: 'adminRole1', role: { name: 'admin' } }]);

      const userData = { username: 'adminuser', email: 'admin@example.com', password: 'password123', roleIds: ['adminRole1'] };
      const user = await authService.registerUser(userData);

      expect(mockRoleRepository.findBy).toHaveBeenCalledWith({ id: ['adminRole1'] });
      expect(mockUserRoleRepository.save).toHaveBeenCalled();
      expect(user).toHaveProperty('id', 'user2');
      expect(user.userRoles[0].role.name).toBe('admin');
    });

    it('should throw ApiError if specified roles do not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValue({ id: 'user3', username: 'failuser', email: 'fail@example.com', password: 'hashedPassword123' });
      mockUserRepository.save.mockImplementation(user => Promise.resolve(user));
      mockRoleRepository.findBy.mockResolvedValue([]); // No roles found for the given IDs

      const userData = { username: 'failuser', email: 'fail@example.com', password: 'password123', roleIds: ['nonExistentRole'] };
      await expect(authService.registerUser(userData)).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'One or more specified roles do not exist.'));
      expect(mockRoleRepository.findBy).toHaveBeenCalledWith({ id: ['nonExistentRole'] });
      expect(mockUserRoleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('loginUserWithEmailAndPassword', () => {
    it('should successfully log in a user', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword123',
        isEmailVerified: true,
        userRoles: [{ role: { name: 'user', rolePermissions: [{ permission: { name: 'user:read' } }] } }],
      };
      mockUserRepository.createQueryBuilder().getOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('mockAccessToken');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('mockRefreshToken');
      mockRefreshTokenRepository.create.mockReturnValue({ token: 'mockRefreshToken', user: mockUser, expiresAt: new Date() });
      mockRefreshTokenRepository.save.mockResolvedValue({});
      mockRedisClient.set.mockResolvedValue('OK');

      const { user, tokens } = await authService.loginUserWithEmailAndPassword('test@example.com', 'password123');

      expect(mockUserRepository.createQueryBuilder().getOne).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(jwtUtils.generateAccessToken).toHaveBeenCalledWith('user1', 'testuser', ['user'], ['user:read']);
      expect(jwtUtils.generateRefreshToken).toHaveBeenCalledWith('user1');
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(tokens).toEqual({ accessToken: 'mockAccessToken', refreshToken: 'mockRefreshToken' });
    });

    it('should throw ApiError for incorrect email or password', async () => {
      mockUserRepository.createQueryBuilder().getOne.mockResolvedValue(null); // User not found

      await expect(authService.loginUserWithEmailAndPassword('wrong@example.com', 'password')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
      expect(mockUserRepository.createQueryBuilder().getOne).toHaveBeenCalled();
    });

    it('should throw ApiError for incorrect password even if user exists', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword123',
        isEmailVerified: true,
        userRoles: [],
      };
      mockUserRepository.createQueryBuilder().getOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Incorrect password

      await expect(authService.loginUserWithEmailAndPassword('test@example.com', 'wrongpassword')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
    });

    it('should throw ApiError if email is not verified', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword123',
        isEmailVerified: false, // Not verified
        userRoles: [],
      };
      mockUserRepository.createQueryBuilder().getOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.loginUserWithEmailAndPassword('test@example.com', 'password123')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Email not verified. Please check your inbox.'));
    });
  });

  describe('refreshAuthTokens', () => {
    it('should successfully refresh tokens with a valid refresh token', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        userRoles: [{ role: { name: 'user', rolePermissions: [{ permission: { name: 'user:read' } }] } }],
      };
      const mockRefreshTokenEntity = {
        token: 'validRefreshToken',
        expiresAt: new Date(Date.now() + 100000), // Not expired
        isRevoked: false,
        user: mockUser,
      };

      jest.spyOn(jwtUtils, 'generateAccessToken').mockReturnValue('newAccessToken');
      jest.spyOn(jwtUtils, 'generateRefreshToken').mockReturnValue('newRefreshToken');
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ userId: 'user1' });

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshTokenEntity);
      mockRefreshTokenRepository.save.mockImplementation(token => Promise.resolve(token));
      mockRedisClient.del.mockResolvedValue(1);
      mockRefreshTokenRepository.create.mockReturnValueOnce({ token: 'newRefreshToken', user: mockUser, expiresAt: new Date() });
      mockRedisClient.set.mockResolvedValue('OK');


      const { user, tokens } = await authService.refreshAuthTokens('validRefreshToken');

      expect(require('jsonwebtoken').verify).toHaveBeenCalledWith('validRefreshToken', expect.any(String));
      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'validRefreshToken', userId: 'user1', isRevoked: false },
        relations: ['user', 'user.userRoles.role.rolePermissions.permission'],
      });
      expect(mockRefreshTokenEntity.isRevoked).toBe(true);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(mockRefreshTokenEntity);
      expect(mockRedisClient.del).toHaveBeenCalledWith('refreshToken:validRefreshToken');
      expect(jwtUtils.generateAccessToken).toHaveBeenCalledWith('user1', 'testuser', ['user'], ['user:read']);
      expect(jwtUtils.generateRefreshToken).toHaveBeenCalledWith('user1');
      expect(user).toHaveProperty('username', 'testuser');
      expect(tokens).toEqual({ accessToken: 'newAccessToken', refreshToken: 'newRefreshToken' });
    });

    it('should throw ApiError for invalid refresh token (JWT verify fail)', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refreshAuthTokens('invalidRefreshToken')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token.'));
    });

    it('should throw ApiError for expired refresh token', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ userId: 'user1' });
      const mockRefreshTokenEntity = {
        token: 'expiredRefreshToken',
        expiresAt: new Date(Date.now() - 100000), // Expired
        isRevoked: false,
        user: { id: 'user1', username: 'testuser' },
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshTokenEntity);

      await expect(authService.refreshAuthTokens('expiredRefreshToken')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token invalid or expired.'));
    });

    it('should throw ApiError for revoked refresh token', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ userId: 'user1' });
      const mockRefreshTokenEntity = {
        token: 'revokedRefreshToken',
        expiresAt: new Date(Date.now() + 100000),
        isRevoked: true, // Revoked
        user: { id: 'user1', username: 'testuser' },
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshTokenEntity);

      await expect(authService.refreshAuthTokens('revokedRefreshToken')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token invalid or expired.'));
    });

    it('should throw ApiError if refresh token not found in DB', async () => {
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ userId: 'user1' });
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(authService.refreshAuthTokens('nonExistentRefreshToken')).rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token invalid or expired.'));
    });
  });

  describe('logout', () => {
    it('should successfully revoke a refresh token', async () => {
      const mockRefreshTokenEntity = {
        token: 'logoutRefreshToken',
        isRevoked: false,
      };
      mockRefreshTokenRepository.findOneBy.mockResolvedValue(mockRefreshTokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue({});
      mockRedisClient.del.mockResolvedValue(1);

      await authService.logout('logoutRefreshToken');

      expect(mockRefreshTokenRepository.findOneBy).toHaveBeenCalledWith({ token: 'logoutRefreshToken', isRevoked: false });
      expect(mockRefreshTokenEntity.isRevoked).toBe(true);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(mockRefreshTokenEntity);
      expect(mockRedisClient.del).toHaveBeenCalledWith('refreshToken:logoutRefreshToken');
    });

    it('should throw ApiError if refresh token not found', async () => {
      mockRefreshTokenRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.logout('nonExistentToken')).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Refresh token not found or already revoked.'));
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate and save a password reset token', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation(user => Promise.resolve(user));

      const token = await authService.generatePasswordResetToken('test@example.com');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.passwordResetToken).toBeDefined();
      expect(mockUser.passwordResetExpires).toBeDefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(token).toBeString();
    });

    it('should throw ApiError if user not found for password reset', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.generatePasswordResetToken('nonexistent@example.com')).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'No user found with that email address.'));
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset a user\'s password', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'oldPassword',
        passwordResetToken: 'validResetToken',
        passwordResetExpires: new Date(Date.now() + 3600000),
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockUserRepository.save.mockImplementation(user => Promise.resolve(user));
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword'); // Mock the subscriber

      await authService.resetPassword('validResetToken', 'NewPassword123!');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        passwordResetToken: 'validResetToken',
        passwordResetExpires: expect.any(Date),
      });
      expect(mockUser.password).toBe('NewPassword123!'); // Subscriber will hash this later
      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ApiError for invalid or expired password reset token', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null); // Token not found or expired

      await expect(authService.resetPassword('invalidToken', 'NewPassword123!')).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired password reset token.'));
    });

    it('should throw ApiError if token is expired', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password: 'oldPassword',
        passwordResetToken: 'expiredToken',
        passwordResetExpires: new Date(Date.now() - 1000), // Expired
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(authService.resetPassword('expiredToken', 'NewPassword123!')).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired password reset token.'));
    });
  });
});
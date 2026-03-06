```typescript
import { AppDataSource } from '../../../src/config/database';
import { authService } from '../../../src/services/auth.service';
import { User } from '../../../src/entities/User';
import { Role, UserRole } from '../../../src/entities/Role';
import { BlacklistedToken } from '../../../src/entities/BlacklistedToken';
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError } from '../../../src/utils/apiErrors';
import { hashPassword, comparePassword } from '../../../src/utils/password';
import { generateAuthTokens, verifyRefreshToken } from '../../../src/utils/jwt';
import { mailService } from '../../../src/services/mail.service';

// Mock repositories and services
const mockUserRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockRoleRepository = {
  findOneBy: jest.fn(),
};

const mockBlacklistedTokenRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      if (entity === User) return mockUserRepository;
      if (entity === Role) return mockRoleRepository;
      if (entity === BlacklistedToken) return mockBlacklistedTokenRepository;
      return {};
    }),
  },
}));

jest.mock('../../../src/utils/password'); // Mock hashPassword and comparePassword
jest.mock('../../../src/utils/jwt'); // Mock JWT functions
jest.mock('../../../src/services/mail.service'); // Mock mail service

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock returns
    (hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
    (comparePassword as jest.Mock).mockResolvedValue(true);
    (generateAuthTokens as jest.Mock).mockReturnValue({
      accessToken: 'mockAccessToken',
      refreshToken: 'mockRefreshToken',
      accessExpires: new Date(Date.now() + 30 * 60 * 1000),
      refreshExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user123', role: UserRole.USER, type: 'refresh' });
    (mailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
    (mailService.sendResetPasswordEmail as jest.Mock).mockResolvedValue(undefined);

    mockRoleRepository.findOneBy.mockResolvedValue({ id: 'role-user-id', name: UserRole.USER });
  });

  // --- Register User Tests ---
  describe('registerUser', () => {
    it('should successfully register a new user and send verification email', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockImplementation((data) => ({ ...data, id: 'new-user-id', role: { id: 'role-user-id', name: UserRole.USER } }));
      mockUserRepository.save.mockImplementation(async (user) => user);

      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Password123!',
      };

      const result = await authService.registerUser(userData);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: userData.email });
      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockRoleRepository.findOneBy).toHaveBeenCalledWith({ name: UserRole.USER });
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          password: 'hashedPassword123',
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: { id: 'role-user-id', name: UserRole.USER },
          isEmailVerified: false,
        })
      );
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('verificationToken');
      expect(result.email).toBe(userData.email);
    });

    it('should throw ConflictError if email already registered', async () => {
      mockUserRepository.findOneBy.mockResolvedValue({ email: 'existing@example.com' });

      const userData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if default user role not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockRoleRepository.findOneBy.mockResolvedValue(null); // No user role found

      const userData = {
        firstName: 'No',
        lastName: 'Role',
        email: 'norole@example.com',
        password: 'Password123!',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(BadRequestError);
      expect(mockRoleRepository.findOneBy).toHaveBeenCalledWith({ name: UserRole.USER });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // --- Login User Tests ---
  describe('loginUser', () => {
    it('should successfully log in a user and return tokens', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        role: { id: 'role-user-id', name: UserRole.USER },
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await authService.loginUser('user@example.com', 'Password123!');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'user@example.com' }, relations: ['role'] })
      );
      expect(mockUser.comparePassword).toHaveBeenCalledWith('Password123!');
      expect(generateAuthTokens).toHaveBeenCalledWith(mockUser.id, mockUser.role.name);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens).toEqual({
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
        accessExpires: expect.any(Date),
        refreshExpires: expect.any(Date),
      });
    });

    it('should throw UnauthorizedError for incorrect email or password', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // User not found
      await expect(authService.loginUser('wrong@example.com', 'Password123!')).rejects.toThrow(UnauthorizedError);

      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        comparePassword: jest.fn().mockResolvedValue(false), // Incorrect password
        role: { id: 'role-user-id', name: UserRole.USER },
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      await expect(authService.loginUser('user@example.com', 'WrongPassword')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if email is not verified', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: false, // Not verified
        comparePassword: jest.fn().mockResolvedValue(true),
        role: { id: 'role-user-id', name: UserRole.USER },
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(authService.loginUser('user@example.com', 'Password123!')).rejects.toThrow(UnauthorizedError);
      expect(mockUser.comparePassword).toHaveBeenCalledTimes(1);
      expect(generateAuthTokens).not.toHaveBeenCalled();
    });
  });

  // --- Logout User Tests ---
  describe('logoutUser', () => {
    it('should blacklist the provided token', async () => {
      const token = 'someAccessToken';
      const expiresAt = new Date();
      mockBlacklistedTokenRepository.create.mockReturnValue({ token, expiresAt });
      mockBlacklistedTokenRepository.save.mockResolvedValue(undefined);

      await authService.logoutUser(token, expiresAt);

      expect(mockBlacklistedTokenRepository.create).toHaveBeenCalledWith({ token, expiresAt });
      expect(mockBlacklistedTokenRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  // --- Refresh Tokens Tests ---
  describe('refreshAuthTokens', () => {
    it('should return new tokens if refresh token is valid', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        role: { id: 'role-user-id', name: UserRole.USER },
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await authService.refreshAuthTokens('validRefreshToken');

      expect(verifyRefreshToken).toHaveBeenCalledWith('validRefreshToken');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user123' }, relations: ['role'] })
      );
      expect(generateAuthTokens).toHaveBeenCalledWith(mockUser.id, mockUser.role.name);
      expect(result).toEqual({
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
        accessExpires: expect.any(Date),
        refreshExpires: expect.any(Date),
      });
    });

    it('should throw UnauthorizedError if refresh token is invalid or expired', async () => {
      (verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('Invalid or expired refresh token.');
      });

      await expect(authService.refreshAuthTokens('invalidRefreshToken')).rejects.toThrow(UnauthorizedError);
      expect(verifyRefreshToken).toHaveBeenCalledWith('invalidRefreshToken');
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      expect(generateAuthTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if user not found for refresh token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // User not found

      await expect(authService.refreshAuthTokens('validRefreshToken')).rejects.toThrow(UnauthorizedError);
      expect(verifyRefreshToken).toHaveBeenCalledWith('validRefreshToken');
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(generateAuthTokens).not.toHaveBeenCalled();
    });
  });

  // --- Forgot Password Tests ---
  describe('forgotPassword', () => {
    it('should send a password reset email if user exists', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        firstName: 'Test',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      await authService.forgotPassword('user@example.com');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(mockUser).toHaveProperty('resetPasswordToken');
      expect(mockUser).toHaveProperty('resetPasswordTokenExpires');
      expect(mailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        expect.any(String)
      );
    });

    it('should do nothing if user does not exist (security precaution)', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await authService.forgotPassword('nonexistent@example.com');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });
  });

  // --- Reset Password Tests ---
  describe('resetPassword', () => {
    it('should reset user password if token is valid and not expired', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        resetPasswordToken: 'validResetToken',
        resetPasswordTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
        password: 'oldPassword',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await authService.resetPassword('validResetToken', 'NewPassword123!');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { resetPasswordToken: 'validResetToken' } });
      expect(hashPassword).toHaveBeenCalledWith('NewPassword123!');
      expect(mockUser.password).toBe('hashedPassword123');
      expect(mockUser.resetPasswordToken).toBeNull();
      expect(mockUser.resetPasswordTokenExpires).toBeNull();
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestError if token is invalid or user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(authService.resetPassword('invalidToken', 'NewPassword123!')).rejects.toThrow(BadRequestError);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { resetPasswordToken: 'invalidToken' } });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if token is expired', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        resetPasswordToken: 'expiredToken',
        resetPasswordTokenExpires: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(authService.resetPassword('expiredToken', 'NewPassword123!')).rejects.toThrow(BadRequestError);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { resetPasswordToken: 'expiredToken' } });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // --- Verify Email Tests ---
  describe('verifyEmail', () => {
    it('should verify user email if token is valid and not expired', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        isEmailVerified: false,
        verificationToken: 'validVerificationToken',
        verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await authService.verifyEmail('validVerificationToken');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { verificationToken: 'validVerificationToken' } });
      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUser.verificationToken).toBeNull();
      expect(mockUser.verificationTokenExpires).toBeNull();
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestError if verification token is invalid or user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(authService.verifyEmail('invalidToken')).rejects.toThrow(BadRequestError);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { verificationToken: 'invalidToken' } });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if verification token is expired', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        isEmailVerified: false,
        verificationToken: 'expiredToken',
        verificationTokenExpires: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(authService.verifyEmail('expiredToken')).rejects.toThrow(BadRequestError);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { verificationToken: 'expiredToken' } });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // --- Resend Verification Email Tests ---
  describe('resendVerificationEmail', () => {
    it('should resend verification email if user exists and email is not verified', async () => {
      const mockUser = {
        id: 'user123',
        email: 'unverified@example.com',
        firstName: 'Unverified',
        isEmailVerified: false,
        verificationToken: 'oldToken',
        verificationTokenExpires: new Date(Date.now() - 1000), // Expired
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      await authService.resendVerificationEmail('unverified@example.com');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'unverified@example.com' });
      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(mockUser.verificationToken).not.toBe('oldToken'); // New token generated
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        expect.any(String)
      );
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.resendVerificationEmail('nonexistent@example.com')).rejects.toThrow(NotFoundError);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if email is already verified', async () => {
      const mockUser = {
        id: 'user123',
        email: 'verified@example.com',
        firstName: 'Verified',
        isEmailVerified: true,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(authService.resendVerificationEmail('verified@example.com')).rejects.toThrow(BadRequestError);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'verified@example.com' });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
```
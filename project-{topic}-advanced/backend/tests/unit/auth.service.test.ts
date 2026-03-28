import { AuthService } from '../../src/services/auth.service';
import { PrismaClient } from '@prisma/client';
import { CustomError } from '../../src/utils/errors.util';
import * as passwordUtil from '../../src/utils/password.util';
import * as jwtUtil from '../../src/utils/jwt.util';
import { UserRole } from '@prisma/client';

// Mock PrismaClient
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
} as unknown as PrismaClient; // Cast to unknown first then to PrismaClient

// Manually mock PrismaClient by extending it
// (this allows actual Prisma methods to be used in some tests if needed)
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
  UserRole: { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' },
}));

// Mock utility functions
jest.mock('../../src/utils/password.util');
jest.mock('../../src/utils/jwt.util');

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    // Reset mocks before each test
    jest.clearAllMocks();
    (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
    (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);
    (jwtUtil.generateToken as jest.Mock).mockReturnValue('mockedJwtToken');
  });

  describe('register', () => {
    it('should successfully register a new user and return a token', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };
      const createdUser = {
        id: 'user-id-1',
        ...userData,
        password: 'hashedPassword123', // Ensure this matches what hashPassword returns
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null); // User does not exist
      (prismaMock.user.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await authService.register(userData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(userData.password);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
          password: 'hashedPassword123',
          role: UserRole.CUSTOMER,
        },
      });
      expect(jwtUtil.generateToken).toHaveBeenCalledWith(createdUser.id);
      expect(result).toEqual({ user: createdUser, token: 'mockedJwtToken' });
    });

    it('should throw CustomError if user with email already exists', async () => {
      const userData = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
      };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-id' }); // User exists

      await expect(authService.register(userData)).rejects.toThrow(CustomError);
      await expect(authService.register(userData)).rejects.toHaveProperty('statusCode', 409);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully log in a user and return a token', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const existingUser = {
        id: 'user-id-1',
        name: 'Test User',
        email,
        password: 'hashedPassword123',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(email, password);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(password, existingUser.password);
      expect(jwtUtil.generateToken).toHaveBeenCalledWith(existingUser.id);
      expect(result).toEqual({ user: existingUser, token: 'mockedJwtToken' });
    });

    it('should throw CustomError if user not found', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(CustomError);
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toHaveProperty('statusCode', 401);
      expect(passwordUtil.comparePassword).not.toHaveBeenCalled();
    });

    it('should throw CustomError if password does not match', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const existingUser = {
        id: 'user-id-1',
        name: 'Test User',
        email,
        password: 'hashedPassword123',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(false); // Incorrect password

      await expect(authService.login(email, password)).rejects.toThrow(CustomError);
      await expect(authService.login(email, password)).rejects.toHaveProperty('statusCode', 401);
      expect(jwtUtil.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile if found', async () => {
      const userId = 'user-id-1';
      const userProfile = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(userProfile);

      const result = await authService.getProfile(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(userProfile);
    });

    it('should return null if user profile not found', async () => {
      const userId = 'non-existent-id';
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.getProfile(userId);

      expect(result).toBeNull();
    });
  });
});
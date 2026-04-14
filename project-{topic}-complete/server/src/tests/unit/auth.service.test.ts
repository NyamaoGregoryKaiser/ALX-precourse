import { PrismaClient } from '@prisma/client';
import * as authService from '../../modules/auth/auth.service';
import { CustomError } from '../../middlewares/error.middleware';
import * as bcrypt from 'bcryptjs';
import * as jwt from '../../utils/jwt';

// Mock PrismaClient
const prisma = new PrismaClient();
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient), UserRole: { MEMBER: 'MEMBER' } };
});

// Mock bcrypt and jwt
jest.mock('bcryptjs');
jest.mock('../../utils/jwt');

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'MEMBER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpassword');
      (prisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, id: 'newuser123', password: 'newhashedpassword' });

      const result = await authService.registerUser('new@example.com', 'password123', 'New', 'User');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'new@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          password: 'newhashedpassword',
          firstName: 'New',
          lastName: 'User',
          role: 'MEMBER',
        },
      });
      expect(result).toEqual(expect.objectContaining({ email: 'new@example.com', firstName: 'New' }));
      expect(result).not.toHaveProperty('password');
    });

    it('should throw CustomError if user with email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.registerUser('test@example.com', 'password123', 'Test', 'User')).rejects.toThrow(
        new CustomError('User with this email already exists.', 409)
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should login a user successfully and return user and token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.generateToken as jest.Mock).mockReturnValue('mocktoken');

      const result = await authService.loginUser('test@example.com', 'password123');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(jwt.generateToken).toHaveBeenCalledWith({ userId: mockUser.id, email: mockUser.email, role: mockUser.role });
      expect(result).toEqual({
        user: expect.objectContaining({ id: mockUser.id, email: mockUser.email }),
        token: 'mocktoken',
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw CustomError for invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.loginUser('nonexistent@example.com', 'password123')).rejects.toThrow(
        new CustomError('Invalid credentials.', 401)
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.generateToken).not.toHaveBeenCalled();
    });

    it('should throw CustomError for invalid password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(
        new CustomError('Invalid credentials.', 401)
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
      expect(jwt.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile if found', async () => {
      const userProfile = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userProfile);

      const result = await authService.getUserProfile(mockUser.id);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: expect.any(Object),
      });
      expect(result).toEqual(userProfile);
    });

    it('should return null if user profile not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.getUserProfile('nonexistent_id');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent_id' },
        select: expect.any(Object),
      });
      expect(result).toBeNull();
    });
  });
});
```typescript
import { authService } from '../../services/auth.service';
import prisma from '../../prisma';
import { hashPassword, comparePassword } from '../../utils/hash';
import { jwtService } from '../../services/jwt.service';
import { ApiError } from '../../middlewares/errorHandler';
import httpStatus from 'http-status';
import { User } from '@prisma/client';

// Mock prisma and hash/jwt services
jest.mock('../../prisma', () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../utils/hash', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../../services/jwt.service', () => ({
  jwtService: {
    generateToken: jest.fn(),
  },
}));

const mockUser: User = {
  id: 'some-uuid',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: 'hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'OFFLINE'
};

describe('AuthService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashedpassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const user = await authService.registerUser('testuser', 'test@example.com', 'password123');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: 'test@example.com' }, { username: 'testuser' }] },
      });
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
        },
      });
      expect(user).toEqual(mockUser);
    });

    it('should throw ApiError if user with email or username already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.registerUser('testuser', 'test@example.com', 'password123'))
        .rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'User with this email or username already exists'));
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should login a user and return a token successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtService.generateToken as jest.Mock).mockReturnValue('mock-jwt-token');

      const { user, token } = await authService.loginUser('test@example.com', 'password123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(comparePassword).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(jwtService.generateToken).toHaveBeenCalledWith('some-uuid');
      expect(user).toEqual(mockUser);
      expect(token).toBe('mock-jwt-token');
    });

    it('should throw ApiError for incorrect email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.loginUser('nonexistent@example.com', 'password123'))
        .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
      expect(comparePassword).not.toHaveBeenCalled();
      expect(jwtService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw ApiError for incorrect password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
      expect(jwtService.generateToken).not.toHaveBeenCalled();
    });
  });
});
```
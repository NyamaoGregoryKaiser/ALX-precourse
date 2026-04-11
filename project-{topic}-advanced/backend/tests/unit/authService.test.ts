```typescript
import { registerUser, loginUser, generateAuthToken } from '../../src/services/authService';
import { PrismaClient, User, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';
import { AppError } from '../../src/utils/errorHandler';

// Mock PrismaClient to prevent actual database interactions
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};
// This is a common pattern for mocking, though more sophisticated mocking might be needed
// For simplicity, we are directly assigning the mock to the client that might be used by services.
// In a real project, you'd usually pass a mocked client to the service or use dependency injection.
jest.mock('../../src/database/prisma/client', () => ({
  prisma: prismaMock,
}));

describe('Auth Service', () => {
  const mockUserRegistrationData = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockUserFromDB: User = {
    id: 'user-id-123',
    email: 'test@example.com',
    password: 'hashedpassword123', // Will be mocked
    name: 'Test User',
    address: null,
    phone: null,
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('generateAuthToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'some-user-id';
      const token = generateAuthToken(userId);
      const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;

      expect(decoded.id).toBe(userId);
      expect(typeof token).toBe('string');
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
      prismaMock.user.create.mockResolvedValue({
        ...mockUserFromDB,
        password: 'mockedHashedPassword',
      }); // User created

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('mockedHashedPassword' as never);

      const { user, token } = await registerUser(mockUserRegistrationData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: mockUserRegistrationData.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserRegistrationData.password, 12);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: mockUserRegistrationData.email,
            password: 'mockedHashedPassword',
            name: mockUserRegistrationData.name,
            role: 'USER',
          }),
        })
      );
      expect(user).not.toHaveProperty('password'); // Password should be excluded
      expect(user.email).toBe(mockUserRegistrationData.email);
      expect(typeof token).toBe('string');
    });

    it('should throw AppError if user with email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUserFromDB); // User already exists

      await expect(registerUser(mockUserRegistrationData)).rejects.toThrow(
        new AppError('User with this email already exists', 409)
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const mockLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully log in a user with correct credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUserFromDB);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const { user, token } = await loginUser(mockLoginData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: mockLoginData.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginData.password, mockUserFromDB.password);
      expect(user).not.toHaveProperty('password');
      expect(user.email).toBe(mockLoginData.email);
      expect(typeof token).toBe('string');
    });

    it('should throw AppError if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(loginUser(mockLoginData)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw AppError if password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUserFromDB);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(loginUser(mockLoginData)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );
    });
  });
});
```
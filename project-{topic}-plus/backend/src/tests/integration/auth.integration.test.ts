```typescript
import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import httpStatus from 'http-status';
import { authService } from '../../services/auth.service'; // Import service to mock if needed
import { UserStatus } from '@prisma/client';

// Mock prisma client for isolation from actual DB during integration tests
// We clean the DB in setup.ts, but for more complex scenarios, you might mock it here.
jest.mock('../../prisma', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(() => []), // Mock $transaction to avoid actual DB operations
  },
}));

// Mock the hash and jwt services if you want to test controllers in isolation from services
jest.mock('../../utils/hash', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn(),
}));

jest.mock('../../services/jwt.service', () => ({
  jwtService: {
    generateToken: jest.fn().mockReturnValue('mock_jwt_token'),
    verifyToken: jest.fn(),
  },
}));

describe('Auth API Integration Tests', () => {
  const newUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };

  const registeredUser = {
    id: 'user-uuid-1',
    username: 'existinguser',
    email: 'existing@example.com',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: UserStatus.OFFLINE
  };

  beforeEach(() => {
    // Reset mocks before each test
    (prisma.user.create as jest.Mock).mockReset();
    (prisma.user.findUnique as jest.Mock).mockReset();
    (prisma.user.findFirst as jest.Mock).mockReset();
    (authService.registerUser as jest.Mock).mockReset();
    (authService.loginUser as jest.Mock).mockReset();

    // Default mock for findFirst to allow registration
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValue(registeredUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username', newUser.username);
      expect(res.body.user).toHaveProperty('email', newUser.email);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if username is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: newUser.email, password: newUser.password })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('"username" is required');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: newUser.username, email: 'invalid-email', password: newUser.password })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('"email" must be a valid email');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 if user with email already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(registeredUser); // Simulate existing user

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('User with this email or username already exists');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user and return a token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(registeredUser);
      require('../../utils/hash').comparePassword.mockResolvedValue(true);
      require('../../services/jwt.service').jwtService.generateToken.mockReturnValue('mock_jwt_token');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: registeredUser.email, password: 'password123' })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('token', 'mock_jwt_token');
      expect(res.body.user).toHaveProperty('email', registeredUser.email);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: registeredUser.email } });
    });

    it('should return 401 for invalid credentials (wrong email)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'password123' })
        .expect(httpStatus.UNAUTHORIZED);

      expect(res.body.message).toContain('Incorrect email or password');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(registeredUser);
      require('../../utils/hash').comparePassword.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: registeredUser.email, password: 'wrongpassword' })
        .expect(httpStatus.UNAUTHORIZED);

      expect(res.body.message).toContain('Incorrect email or password');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('"email" is required');
    });
  });
});
```
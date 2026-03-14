import request from 'supertest';
import express from 'express'; // Import express for test app
import authRoutes from '../routes/auth.routes';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../dtos/auth.dto';
import { CustomError } from '../exceptions/custom.error';
import httpStatus from 'http-status-codes';
import { errorHandler } from '../middleware/error.middleware'; // Import error handler

// Mock AuthService
jest.mock('../services/auth.service');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Setup a minimal Express app for testing routes
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler); // Crucial for catching CustomErrors in tests

describe('Auth Controller (API Tests)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Ensure the mock is a constructor if it's used with 'new'
    mockAuthService.mockClear();
    (mockAuthService.prototype.register as jest.Mock).mockClear();
    (mockAuthService.prototype.login as jest.Mock).mockClear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a user and return 201 with user details', async () => {
      const mockUser = {
        id: 'some-uuid',
        username: 'testuser',
        email: 'test@example.com',
        role: 'member'
      };
      (mockAuthService.prototype.register as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(httpStatus.CREATED);
      expect(res.body).toEqual({
        message: 'User registered successfully',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        }
      });
      expect(mockAuthService.prototype.register).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      });
    });

    it('should return 409 if user already exists', async () => {
      (mockAuthService.prototype.register as jest.Mock).mockRejectedValue(
        new CustomError('User with this email or username already exists', httpStatus.CONFLICT)
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(httpStatus.CONFLICT);
      expect(res.body.message).toBe('User with this email or username already exists');
    });

    it('should return 400 for invalid input (validation error)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'tu', // Too short
          email: 'invalid-email',
          password: '123' // Too short
        });

      expect(res.statusCode).toEqual(httpStatus.BAD_REQUEST);
      expect(res.body.message).toContain('Validation failed');
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user and return 200 with token and user details', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'member'
      };
      (mockAuthService.prototype.login as jest.Mock).mockResolvedValue({
        token: 'mock-jwt-token',
        user: mockUser
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual({
        message: 'Logged in successfully',
        token: 'mock-jwt-token',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        }
      });
      expect(mockAuthService.prototype.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!'
      });
    });

    it('should return 401 for invalid credentials', async () => {
      (mockAuthService.prototype.login as jest.Mock).mockRejectedValue(
        new CustomError('Invalid credentials', httpStatus.UNAUTHORIZED)
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(httpStatus.UNAUTHORIZED);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid input (validation error)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '' // Empty password
        });

      expect(res.statusCode).toEqual(httpStatus.BAD_REQUEST);
      expect(res.body.message).toContain('Validation failed');
      expect(res.body.errors).toBeDefined();
    });
  });
});
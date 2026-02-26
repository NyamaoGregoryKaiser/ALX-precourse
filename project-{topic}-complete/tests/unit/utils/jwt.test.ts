import { generateToken, verifyToken } from '../../../src/utils/jwt';
import { AppError } from '../../../src/utils/AppError';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../../src/config';
import { UserRole } from '../../../src/database/entities/User.entity';
import jwt from 'jsonwebtoken';

describe('JWT Utility', () => {
  const payload = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  beforeAll(() => {
    // Ensure JWT_SECRET is set for tests
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_EXPIRES_IN = '1s'; // Short expiry for testing
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, JWT_SECRET) as typeof payload & { iat: number; exp: number };
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw AppError if JWT_SECRET is not defined (mock error)', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET; // Temporarily unset
      expect(() => generateToken(payload)).toThrow(AppError);
      expect(() => generateToken(payload)).toThrow('Failed to generate authentication token.');
      process.env.JWT_SECRET = originalSecret; // Restore
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid token', () => {
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw AppError for an expired token', async () => {
      // Generate a token that expires quickly
      const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1ms' });
      // Wait for it to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(() => verifyToken(expiredToken)).toThrow(AppError);
      expect(() => verifyToken(expiredToken)).toThrow('Authentication token has expired.');
      expect(() => verifyToken(expiredToken)).toThrow(expect.objectContaining({ name: 'TokenExpired' }));
    });

    it('should throw AppError for an invalid token (wrong secret)', () => {
      const invalidToken = jwt.sign(payload, 'wrongsecret', { expiresIn: JWT_EXPIRES_IN });
      expect(() => verifyToken(invalidToken)).toThrow(AppError);
      expect(() => verifyToken(invalidToken)).toThrow('Invalid authentication token.');
      expect(() => verifyToken(invalidToken)).toThrow(expect.objectContaining({ name: 'InvalidToken' }));
    });

    it('should throw AppError for a malformed token', () => {
      const malformedToken = 'invalid.jwt.token';
      expect(() => verifyToken(malformedToken)).toThrow(AppError);
      expect(() => verifyToken(malformedToken)).toThrow('Invalid authentication token.');
      expect(() => verifyToken(malformedToken)).toThrow(expect.objectContaining({ name: 'InvalidToken' }));
    });
  });
});
```typescript
import jwt from 'jsonwebtoken';
import { generateToken, generateAuthTokens, verifyToken, verifyAccessToken, verifyRefreshToken } from '../../../src/utils/jwt';
import { UnauthorizedError } from '../../../src/utils/apiErrors';
import { config } from '../../../src/config';

// Mock config to ensure consistent secret and expiry in tests
jest.mock('../../../src/config', () => ({
  config: {
    jwt: {
      secret: 'test_jwt_secret',
      accessExpirationMinutes: 1, // 1 minute for testing
      refreshExpirationDays: 7,
    },
  },
}));

describe('JWT Utilities', () => {
  const testUserId = 'test-user-id';
  const testUserRole = 'user';
  const testSecret = config.jwt.secret;

  describe('generateToken', () => {
    it('should generate a valid JWT with correct payload and expiry', () => {
      const expiresIn = '1h';
      const token = generateToken(testUserId, testUserRole, expiresIn, 'access');
      const decoded = jwt.verify(token, testSecret) as jwt.JwtPayload;

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testUserRole);
      expect(decoded.type).toBe('access');
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
    });
  });

  describe('generateAuthTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = generateAuthTokens(testUserId, testUserRole);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('accessExpires');
      expect(tokens).toHaveProperty('refreshExpires');

      const decodedAccess = jwt.verify(tokens.accessToken, testSecret) as jwt.JwtPayload;
      expect(decodedAccess.userId).toBe(testUserId);
      expect(decodedAccess.role).toBe(testUserRole);
      expect(decodedAccess.type).toBe('access');

      const decodedRefresh = jwt.verify(tokens.refreshToken, testSecret) as jwt.JwtPayload;
      expect(decodedRefresh.userId).toBe(testUserId);
      expect(decodedRefresh.role).toBe(testUserRole);
      expect(decodedRefresh.type).toBe('refresh');
    });

    it('should set appropriate expiry times for access and refresh tokens', () => {
      const tokens = generateAuthTokens(testUserId, testUserRole);

      const accessDiff = tokens.accessExpires.getTime() - Date.now();
      const refreshDiff = tokens.refreshExpires.getTime() - Date.now();

      // Check if expiry is roughly within the configured minutes/days
      expect(accessDiff).toBeGreaterThan(0);
      expect(accessDiff).toBeLessThanOrEqual((config.jwt.accessExpirationMinutes + 1) * 60 * 1000); // Allow for small time difference
      expect(refreshDiff).toBeGreaterThan(0);
      expect(refreshDiff).toBeLessThanOrEqual((config.jwt.refreshExpirationDays + 1) * 24 * 60 * 60 * 1000);
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid token', () => {
      const token = generateToken(testUserId, testUserRole, '1h', 'access');
      const decoded = verifyToken(token, testSecret);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testUserRole);
      expect(decoded.type).toBe('access');
    });

    it('should throw UnauthorizedError for an invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      expect(() => verifyToken(invalidToken, testSecret)).toThrow(UnauthorizedError);
      expect(() => verifyToken(invalidToken, testSecret)).toThrow('Invalid token.');
    });

    it('should throw UnauthorizedError for an expired token', async () => {
      // Generate a token that expires very quickly
      const expiredToken = generateToken(testUserId, testUserRole, '1ms', 'access');

      // Wait for the token to expire
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(() => verifyToken(expiredToken, testSecret)).toThrow(UnauthorizedError);
      expect(() => verifyToken(expiredToken, testSecret)).toThrow('Token expired.');
    });

    it('should throw UnauthorizedError if secret is incorrect', () => {
      const token = generateToken(testUserId, testUserRole, '1h', 'access');
      expect(() => verifyToken(token, 'wrong_secret')).toThrow(UnauthorizedError);
      expect(() => verifyToken(token, 'wrong_secret')).toThrow('Invalid token.');
    });
  });

  describe('verifyAccessToken', () => {
    it('should successfully verify an access token', () => {
      const token = generateToken(testUserId, testUserRole, '1h', 'access');
      const decoded = verifyAccessToken(token);
      expect(decoded.type).toBe('access');
    });

    it('should throw UnauthorizedError if token type is not "access"', () => {
      const refreshToken = generateToken(testUserId, testUserRole, '7d', 'refresh');
      expect(() => verifyAccessToken(refreshToken)).toThrow(UnauthorizedError);
      expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid token type.');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should successfully verify a refresh token', () => {
      const token = generateToken(testUserId, testUserRole, '7d', 'refresh');
      const decoded = verifyRefreshToken(token);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw UnauthorizedError if token type is not "refresh"', () => {
      const accessToken = generateToken(testUserId, testUserRole, '1h', 'access');
      expect(() => verifyRefreshToken(accessToken)).toThrow(UnauthorizedError);
      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid token type.');
    });
  });
});
```
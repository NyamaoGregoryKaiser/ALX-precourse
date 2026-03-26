```javascript
const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../../config/config');
const { generateToken, verifyToken, generateAuthTokens } = require('../../src/utils/jwt');

describe('JWT Utility', () => {
  const userId = 1;
  const secret = config.jwt.secret;

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const expiresInMinutes = 1;
      const token = generateToken(userId, secret, expiresInMinutes);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const decoded = jwt.verify(token, secret);
      expect(decoded.sub).toBe(userId);
      expect(decoded.iat).toBeLessThanOrEqual(moment().unix());
      expect(decoded.exp).toBeGreaterThan(moment().unix());
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid token', () => {
      const expiresInMinutes = 1;
      const token = generateToken(userId, secret, expiresInMinutes);
      const decoded = verifyToken(token, secret);
      expect(decoded.sub).toBe(userId);
    });

    it('should throw an error for an invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      expect(() => verifyToken(invalidToken, secret)).toThrow('Invalid or expired token');
    });

    it('should throw an error for an expired token', async () => {
      // Generate a token that expires immediately
      const expiredToken = generateToken(userId, secret, -1);
      // Wait a moment to ensure it's expired for systems with low clock precision
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(() => verifyToken(expiredToken, secret)).toThrow('Invalid or expired token');
    });

    it('should throw an error for a token signed with a different secret', () => {
      const token = generateToken(userId, 'different_secret', 1);
      expect(() => verifyToken(token, secret)).toThrow('Invalid or expired token');
    });
  });

  describe('generateAuthTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = generateAuthTokens(userId);

      expect(tokens).toHaveProperty('access');
      expect(tokens).toHaveProperty('refresh');

      expect(tokens.access).toHaveProperty('token');
      expect(tokens.access).toHaveProperty('expires');
      expect(tokens.refresh).toHaveProperty('token');
      expect(tokens.refresh).toHaveProperty('expires');

      const decodedAccess = jwt.verify(tokens.access.token, secret);
      expect(decodedAccess.sub).toBe(userId);
      // Check expiration is roughly correct
      expect(moment.unix(decodedAccess.exp).diff(moment(), 'minutes')).toBeCloseTo(config.jwt.accessExpirationMinutes, -1);

      const decodedRefresh = jwt.verify(tokens.refresh.token, secret);
      expect(decodedRefresh.sub).toBe(userId);
      expect(moment.unix(decodedRefresh.exp).diff(moment(), 'days')).toBeCloseTo(config.jwt.refreshExpirationDays, -1);
    });
  });
});
```
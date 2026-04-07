const { generateToken, verifyToken, getExpirationDate } = require('../../services/token.service');
const config = require('../../config/config');
const moment = require('moment');

describe('Token Service Unit Tests', () => {
  describe('generateToken', () => {
    it('should generate an access token', () => {
      const userId = 'test-user-id';
      const token = generateToken(userId, 'access');
      expect(token).toBeDefined();

      const payload = verifyToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('access');
      expect(moment.unix(payload.exp).isAfter(moment())).toBe(true);
    });

    it('should generate a refresh token', () => {
      const userId = 'test-user-id';
      const token = generateToken(userId, 'refresh');
      expect(token).toBeDefined();

      const payload = verifyToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('refresh');
      expect(moment.unix(payload.exp).isAfter(moment())).toBe(true);
    });

    it('should expire tokens correctly', () => {
      const userId = 'test-user-id';
      // Temporarily set a very short expiration for testing
      const originalAccessExp = config.jwt.accessExpirationMinutes;
      config.jwt.accessExpirationMinutes = 0.001; // ~60ms

      const token = generateToken(userId, 'access');
      const expiresAt = getExpirationDate('access');

      // Restore original config immediately
      config.jwt.accessExpirationMinutes = originalAccessExp;

      expect(moment(expiresAt).isAfter(moment())).toBe(true); // Should be in the future when generated
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => verifyToken(token)).toThrow('jwt expired');
          resolve();
        }, 100); // Wait longer than 60ms
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'valid-user-id';
      const token = generateToken(userId, 'access');
      const payload = verifyToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('access');
    });

    it('should throw an error for an invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw an error for a tampered token', () => {
      const userId = 'original-user-id';
      const originalToken = generateToken(userId, 'access');
      // Tamper with the token (e.g., change a character)
      const tamperedToken = originalToken.slice(0, -1) + 'A';
      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });
});
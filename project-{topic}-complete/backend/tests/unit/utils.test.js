const { generateToken, verifyToken } = require('../../src/utils/jwt');
const { hashPassword, comparePassword } = require('../../src/utils/bcrypt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock environment variables for testing
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRES_IN = '1h';

describe('JWT Utilities', () => {
  const payload = { id: 'some-uuid', role: 'user' };

  it('should generate a valid JWT token', () => {
    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
  });

  it('should verify a valid JWT token', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
  });

  it('should throw an error for an invalid token', () => {
    const invalidToken = 'invalid.jwt.token';
    expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
  });

  it('should throw an error for an expired token', () => {
    // Generate a token that expires immediately
    const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '0s' });
    // Wait for the token to expire
    return new Promise(resolve => setTimeout(() => {
      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
      resolve();
    }, 100)); // Small delay to ensure token is truly expired
  });
});

describe('Bcrypt Utilities', () => {
  const plainPassword = 'mysecretpassword';

  it('should hash a password', async () => {
    const hashedPassword = await hashPassword(plainPassword);
    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword.length).toBeGreaterThan(50); // Typical bcrypt hash length
  });

  it('should compare a plain password with its hash successfully', async () => {
    const hashedPassword = await hashPassword(plainPassword);
    const isMatch = await comparePassword(plainPassword, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect password comparison', async () => {
    const hashedPassword = await hashPassword(plainPassword);
    const isMatch = await comparePassword('wrongpassword', hashedPassword);
    expect(isMatch).toBe(false);
  });
});
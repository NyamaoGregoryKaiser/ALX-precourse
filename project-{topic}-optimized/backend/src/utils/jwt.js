const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const logger = require('../config/logger');

/**
 * Generates a JWT access token.
 * @param {object} payload - The payload to sign into the token (e.g., { id: user.id, role: user.role }).
 * @returns {string} The signed JWT token.
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {object} The decoded payload if valid.
 * @throws {Error} If the token is invalid or expired.
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    return decoded;
  } catch (error) {
    logger.warn('Error verifying token:', error.message);
    throw error; // Let middleware handle specific JWT errors
  }
};

/**
 * Generates a refresh token.
 * @param {object} payload - The payload to sign into the refresh token.
 * @returns {string} The signed refresh token.
 */
const generateRefreshToken = (payload) => {
  try {
    const refreshToken = jwt.sign(payload, jwtConfig.refreshTokenSecret, { expiresIn: jwtConfig.refreshTokenExpiresIn });
    return refreshToken;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

module.exports = {
  generateAccessToken,
  verifyToken,
  generateRefreshToken, // Export for use if refresh token logic is implemented
};
```
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const AppError = require('./appError');
const logger = require('../config/logger');

/**
 * Generates a JWT token.
 * @param {object} payload - The data to store in the token (e.g., user ID, role).
 * @returns {string} The generated JWT token.
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new AppError('Failed to generate authentication token.', 500);
  }
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {object} The decoded payload if the token is valid.
 * @throws {Error} If the token is invalid or expired.
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    logger.warn(`JWT verification failed: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401);
    }
    throw new AppError('Invalid token', 401);
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
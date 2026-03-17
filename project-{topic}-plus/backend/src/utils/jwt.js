```javascript
const jwt = require('jsonwebtoken');
const { jwtSecret, accessTokenExpiration, refreshTokenExpiration } = require('../config/jwt');
const { AppError } = require('./appError');

/**
 * Generates a JSON Web Token.
 * @param {string} id - The user ID to include in the token payload.
 * @param {string} role - The user role to include in the token payload.
 * @param {string} expiresIn - The expiration time for the token (e.g., '1h', '7d').
 * @returns {string} The generated JWT.
 */
const generateToken = (id, role, expiresIn) => {
  if (!id || !role || !expiresIn) {
    throw new AppError('JWT generation requires ID, role, and expiration.', 500);
  }
  return jwt.sign({ id, role }, jwtSecret, { expiresIn });
};

/**
 * Generates both an access token and a refresh token for a user.
 * @param {object} user - The user object containing id and role.
 * @returns {object} An object containing accessToken and refreshToken.
 */
const generateAuthTokens = (user) => {
  const accessToken = generateToken(user.id, user.role, accessTokenExpiration);
  const refreshToken = generateToken(user.id, user.role, refreshTokenExpiration);
  return { accessToken, refreshToken };
};

/**
 * Verifies a JSON Web Token.
 * @param {string} token - The token string to verify.
 * @returns {object} The decoded token payload.
 * @throws {AppError} If the token is invalid or expired.
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired.', 401);
    }
    throw new AppError('Invalid token.', 401);
  }
};

module.exports = {
  generateToken,
  generateAuthTokens,
  verifyToken,
};
```
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generates a JWT token.
 * @param {string} userId - The user ID to embed in the token.
 * @param {string[]} roles - The user's roles to embed in the token.
 * @returns {string} The signed JWT token.
 */
const generateToken = (userId, roles) => {
  const payload = {
    sub: userId,
    roles: roles,
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiration });
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {object|null} The decoded payload if valid, null otherwise.
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
```
```javascript
// This file is conceptually where JWT generation might be if it wasn't a method on the User model.
// For this project, the `User.getSignedJwtToken()` method handles JWT creation.
// This file can serve as a placeholder for more complex JWT logic (e.g., refresh tokens).

const jwt = require('jsonwebtoken');
const config = require('../config');
const { CustomError } = require('./error');

/**
 * Generates a JWT token for a given user ID and role.
 * @param {string} id - User ID.
 * @param {string} role - User role.
 * @returns {string} The signed JWT token.
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {object} The decoded payload if valid.
 * @throws {CustomError} If the token is invalid or expired.
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new CustomError('Invalid or expired token', 401);
  }
};

module.exports = { generateToken, verifyToken };

// Note: In this project, `User.js` model includes `getSignedJwtToken` method.
// This file demonstrates how `generateToken` and `verifyToken` could be externalized
// if not tied directly to a Mongoose model instance.
```
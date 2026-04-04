```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Signs a JWT token for a given user ID.
 * @param {string} id - The user ID to include in the token payload.
 * @returns {string} The signed JWT token.
 */
const signToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {Promise<object>} A promise that resolves with the decoded payload if valid,
 *                           or rejects if the token is invalid or expired.
 */
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
};

module.exports = {
  signToken,
  verifyToken,
};
```
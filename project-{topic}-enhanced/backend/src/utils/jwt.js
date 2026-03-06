```javascript
// This file is now deprecated. JWT token generation/verification is handled directly in tokenService.js
// This file might be kept for simple utility functions or if more JWT specific helper logic is needed.
// For now, its functionality is absorbed by tokenService.

import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token.
 * @returns {object} The decoded payload.
 * @throws {Error} If token is invalid or expired.
 */
export const verifyJwtToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid or expired token.');
  }
};

/**
 * Decodes a JWT token without verification.
 * @param {string} token - The JWT token.
 * @returns {object|null} The decoded payload or null.
 */
export const decodeJwtToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};
```
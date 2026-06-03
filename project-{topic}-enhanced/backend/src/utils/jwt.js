```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('./appError');
const logger = require('./logger');

const signToken = (payload) => {
  try {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expirationTime,
    });
  } catch (err) {
    logger.error('Error signing JWT token:', err.message);
    throw new AppError('Could not generate authentication token.', 500, 'JWT_SIGN_ERROR');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    logger.warn('Error verifying JWT token:', err.message);
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Authentication token expired.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
  }
};

module.exports = {
  signToken,
  verifyToken,
};
```
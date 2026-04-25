```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { AppError } = require('./errorHandler');

exports.generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

exports.verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Access token expired', 401, 'TokenExpiredError');
    }
    throw new AppError('Invalid access token', 401, 'JsonWebTokenError');
  }
};

exports.generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

exports.verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', 401, 'TokenExpiredError');
    }
    throw new AppError('Invalid refresh token', 401, 'JsonWebTokenError');
  }
};
```
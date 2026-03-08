```javascript
const httpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const ApiError = require('../utils/apiError');
const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

const auth = (requiredRoles) => catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await userService.getUserById(payload.sub);

    if (!user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not found for token'));
    }

    // Attach user and payload to request
    req.user = user;
    req.tokenPayload = payload;

    // Check if roles are required and if user has them
    if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Insufficient permissions'));
      }
    } else if (requiredRoles && !Array.isArray(requiredRoles) && requiredRoles !== user.role) {
      // If a single role string is passed instead of an array
      return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Insufficient permissions'));
    }

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
    }
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed'));
  }
});

module.exports = auth;
```
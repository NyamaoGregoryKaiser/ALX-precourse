```javascript
const jwt = require('jsonwebtoken');
const db = require('../database');
const { jwtSecret } = require('../config/jwt');
const { AppError } = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized, no token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    // Find user by ID, excluding password and refresh token by default
    const user = await db.User.findByPk(decoded.id);

    if (!user) {
      throw new AppError('User not found. Token is invalid.', 401);
    }
    
    // Attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please log in again.', 401);
    }
    throw new AppError('Not authorized, token failed or invalid.', 401);
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(`User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route. Required roles: ${roles.join(', ')}.`, 403);
    }
    next();
  };
};

module.exports = { protect, authorize };
```
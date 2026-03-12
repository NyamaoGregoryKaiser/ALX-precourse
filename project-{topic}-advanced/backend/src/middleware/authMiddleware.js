const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler'); // A simple utility to wrap async express route handlers
const User = require('../models/user');
const logger = require('../utils/logger');

// Utility to wrap async functions to catch errors
const asyncHandlerWrapper = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


const protect = asyncHandlerWrapper(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to the request object, excluding password
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!req.user) {
        const error = new Error('User not found.');
        error.statusCode = 401;
        return next(error);
      }

      next();
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      const authError = new Error('Not authorized, token failed.');
      authError.statusCode = 401;
      next(authError);
    }
  }

  if (!token) {
    const error = new Error('Not authorized, no token.');
    error.statusCode = 401;
    next(error);
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error(`User role ${req.user ? req.user.role : 'N/A'} is not authorized to access this route.`);
      error.statusCode = 403; // Forbidden
      return next(error);
    }
    next();
  };
};

module.exports = { protect, authorize };
```

### `backend/src/middleware/asyncHandler.js` (Async Handler for routes)
```javascript
```javascript
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/user');
const config = require('../config/config');
const asyncHandler = require('./asyncHandler'); // A utility to wrap async route handlers

// Utility for wrapping async handlers to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) { // If using cookie for token
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized to access this route. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = await User.findByPk(decoded.id);

    if (!req.user) {
      throw new ApiError(401, 'Not authorized to access this route. User not found.');
    }
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Not authorized to access this route. Invalid token.');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Not authorized to access this route. Token expired.');
    }
    throw new ApiError(401, 'Not authorized to access this route.');
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route.`);
    }
    next();
  };
};

module.exports = { protect, authorize, asyncHandler };
```
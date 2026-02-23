```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { CustomError } = require('../utils/error');

/**
 * Middleware to protect routes, ensuring only authenticated users can access.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new CustomError('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new CustomError('User not found with this token', 401));
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    return next(new CustomError('Not authorized, token failed', 401));
  }
};

/**
 * Middleware for role-based authorization.
 * @param {string[]} roles - Array of roles allowed to access the route.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new CustomError(`User role ${req.user ? req.user.role : 'none'} is not authorized to access this route`, 403));
    }
    next();
  };
};
```
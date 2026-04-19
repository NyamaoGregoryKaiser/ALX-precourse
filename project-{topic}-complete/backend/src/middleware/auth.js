const { verifyToken } = require('../utils/jwt');
const User = require('../models/user');
const AppError = require('../utils/appError');
const logger = require('../config/logger');

/**
 * Middleware to protect routes, ensuring user is authenticated.
 * Attaches user object to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('No token provided.', 401));
    }

    const decoded = verifyToken(token); // Throws error if token is invalid or expired

    const currentUser = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] } // Do not return password hash
    });

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Unauthorized: Token expired.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Unauthorized: Invalid token.', 401));
    }
    logger.error('Authentication error:', error.message);
    next(new AppError('Authentication failed.', 401));
  }
};

/**
 * Middleware for role-based authorization.
 * @param {string[]} roles - Array of roles allowed to access the route (e.g., ['admin', 'user']).
 */
const authorize = (roles = []) => {
  if (!Array.isArray(roles)) {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authorization failed: No user found after authentication.', 403));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
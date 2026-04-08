const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const User = require('../models/User')(require('../config/database'), require('sequelize')); // Import sequelize instance to get User model
const { UnauthorizedError, ForbiddenError, APIError } = require('../utils/errors');
const logger = require('../config/logger');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new UnauthorizedError('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'email', 'role'], // Fetch only necessary attributes
    });

    if (!user) {
      return next(new UnauthorizedError('Invalid token: User not found'));
    }

    req.user = user; // Attach user object to the request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('JWT token expired', { token });
      return next(new UnauthorizedError('Token expired', 'TokenExpiredError'));
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token', { token, error: error.message });
      return next(new UnauthorizedError('Invalid token', 'InvalidTokenError'));
    }
    logger.error('Error verifying JWT token:', { error: error.message, stack: error.stack });
    next(new APIError('Failed to authenticate token', 500));
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new UnauthorizedError('User role not found or not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`User ${req.user.id} with role ${req.user.role} attempted to access forbidden resource. Required roles: ${roles.join(', ')}`);
      return next(new ForbiddenError('Access forbidden'));
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};
```
```javascript
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const config = require('../../config/config');
const { User } = require('../models');

/**
 * Authentication middleware to verify JWT token.
 * Attaches user object to `req.user` if authenticated.
 */
const auth = catchAsync(async (req, res, next) => {
  // 1. Check for token in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // 3. Find user by ID from token payload
    const user = await User.findByPk(decoded.sub);

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found or token invalid');
    }

    // 4. Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }
    // Re-throw generic error or wrap it
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message || 'Authentication failed');
  }
});

/**
 * Authorization middleware for Role-Based Access Control (RBAC).
 * Checks if the authenticated user has any of the required roles.
 * @param {Array<string>} requiredRoles - An array of roles allowed to access the route (e.g., ['admin', 'manager']).
 */
const authorize = (requiredRoles) => (req, res, next) => {
  // Check if req.user is set by the auth middleware
  if (!req.user) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'User not authenticated. Authorization check failed.'));
  }

  const userRole = req.user.role;

  // Check if the user's role is included in the required roles
  if (!requiredRoles.includes(userRole)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Insufficient permissions'));
  }

  next();
};

module.exports = {
  auth,
  authorize,
};
```
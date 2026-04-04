```javascript
const AppError = require('../../utils/appError');

/**
 * Middleware to restrict access to routes based on user roles.
 * @param {...string} roles - A list of allowed roles (e.g., 'admin', 'user').
 * @returns {Function} Express middleware function.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // roles is an array like ['ADMIN', 'USER']
    if (!req.user) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403) // 403 Forbidden
      );
    }

    next();
  };
};

module.exports = authorize;
```
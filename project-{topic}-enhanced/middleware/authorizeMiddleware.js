```javascript
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

exports.authorize = (...roles) => {
  return (req, res, next) => {
    // roles is an array like ['admin', 'user']
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Authorization failed for user ${req.user ? req.user.email : 'N/A'}. Required roles: ${roles.join(', ')}. User role: ${req.user ? req.user.role : 'N/A'}`);
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
```
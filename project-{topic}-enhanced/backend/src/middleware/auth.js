```javascript
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const db = require('../config/db');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) { // Example for cookie-based auth
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401, 'UNAUTHENTICATED'));
  }

  try {
    const decoded = verifyToken(token); // decoded will contain { id, type, iat, exp }

    // Check if user still exists
    const user = await db('users').where({ id: decoded.id }).first();
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (err) {
    logger.warn('Authentication failed:', err.message);
    return next(err); // Pass the specific AppError from verifyToken (e.g., TOKEN_EXPIRED, INVALID_TOKEN)
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.type)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, 'UNAUTHORIZED_ACTION')
      );
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
```
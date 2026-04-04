```javascript
const { promisify } = require('util');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');
const { verifyToken } = require('../../utils/jwt');
const userRepository = require('../../repositories/userRepository');

/**
 * Middleware to protect routes by verifying JWT token.
 * Attaches the authenticated user to `req.user`.
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Get token from request header or cookie
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2. Verify token
  const decoded = await promisify(verifyToken)(token);

  // 3. Check if user still exists
  const currentUser = await userRepository.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. If everything is OK, attach user to request object
  req.user = currentUser;
  next();
});

module.exports = protect;
```
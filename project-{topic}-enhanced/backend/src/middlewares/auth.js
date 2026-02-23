```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/prisma');

/**
 * Middleware to protect routes, ensuring user is authenticated.
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Get token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) { // Optional: support cookie-based token
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError(401, 'You are not logged in! Please log in to get access.'));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return next(new AppError(401, 'Invalid token. Please log in again.'));
  }

  // 3. Check if user still exists
  const currentUser = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, role: true, name: true } // Select minimal necessary fields
  });

  if (!currentUser) {
    return next(new AppError(401, 'The user belonging to this token no longer exists.'));
  }

  // 4. Attach user to request object
  req.user = currentUser;
  next();
});

/**
 * Middleware to restrict access based on user roles.
 * @param {string[]} allowedRoles - An array of roles that are allowed to access the route.
 */
const authorize = (allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next(new AppError(403, 'User role not found. Access denied.'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError(403, 'You do not have permission to perform this action.'));
  }

  next();
};

module.exports = { protect, authorize };
```
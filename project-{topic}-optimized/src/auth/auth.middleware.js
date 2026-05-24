import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import prisma from '../utils/prisma.js';
import { Role } from '@prisma/client';

/**
 * Middleware to protect routes by verifying JWT access token.
 */
const protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) Get token and check if it exists
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again!', 401));
  }

  // 3) Check if user still exists
  const currentUser = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, username: true, email: true, role: true }, // Select only necessary fields
  });
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4) Grant access to protected route
  req.user = currentUser; // Attach user object to request
  next();
});

/**
 * Middleware for role-based authorization.
 * @param {Array<Role>} allowedRoles - An array of roles that are allowed to access the route.
 */
const restrictTo = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

export {
  protect,
  restrictTo,
};
```

```javascript
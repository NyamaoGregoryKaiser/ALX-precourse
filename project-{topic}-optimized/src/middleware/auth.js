const jwt = require('jsonwebtoken');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { Customer } = require('../db/models');

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentCustomer = await Customer.findByPk(decoded.id);
  if (!currentCustomer) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentCustomer.passwordChangedAt) {
    const changedTimestamp = parseInt(currentCustomer.passwordChangedAt.getTime() / 1000, 10);
    if (decoded.iat < changedTimestamp) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }
  }

  // Grant access to protected route
  req.customer = currentCustomer;
  res.locals.customer = currentCustomer; // For rendering, if needed
  next();
});

exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.customer.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    // Special case: customers can only access their own data
    if (req.customer.role === 'customer' && req.params.id && req.params.id !== req.customer.id) {
        // For /customers/:id, customer can only view own profile
        // For /transactions/:id, customer can only view own transaction
        // This general check needs to be more specific per route,
        // but as a fallback, we broadly deny access to other customer's resources.
        // More fine-grained logic would be in services or controllers.
        // For this example, we'll allow specific controller logic to override
        // but broadly restrict customers from accessing other users' :id resources.
        // This is a simplified check. Actual RBAC can be more complex.
        const isAccessingOwnResource = req.params.id === req.customer.id || req.body.customerId === req.customer.id;
        if (!isAccessingOwnResource && !roles.includes('admin')) {
             return next(
                new AppError('You do not have permission to perform this action', 403)
            );
        }
    }
    next();
  };
};
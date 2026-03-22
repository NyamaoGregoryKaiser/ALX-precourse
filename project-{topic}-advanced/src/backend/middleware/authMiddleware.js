```javascript
const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');

/**
 * Middleware to protect routes by verifying JWT token.
 * Attaches the authenticated user to `req.user`.
 */
exports.protect = catchAsync(async (req, res, next) => {
    // 1) Get token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', StatusCodes.UNAUTHORIZED)
        );
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
        return next(
            new AppError('The user belonging to this token no longer exists.', StatusCodes.UNAUTHORIZED)
        );
    }

    // 4) Grant access to protected route
    req.user = currentUser;
    next();
});

/**
 * Middleware to restrict access based on user roles.
 * Pass in roles allowed to access the route (e.g., `authorize('admin', 'editor')`).
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action',
                    StatusCodes.FORBIDDEN
                )
            );
        }
        next();
    };
};
```
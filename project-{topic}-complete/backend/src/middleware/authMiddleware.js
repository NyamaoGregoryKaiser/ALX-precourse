```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../config/db');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes, ensuring user is authenticated.
 * Attaches user to req.user
 */
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, config.jwt.secret);

            // Find user by ID from token payload
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] } // Exclude password from the returned user object
            });

            if (!req.user) {
                return next(new AppError('User not found. Invalid token.', 401));
            }

            next();
        } catch (error) {
            logger.error('Authentication error:', error.message);
            return next(new AppError('Not authorized, token failed or expired.', 401));
        }
    }

    if (!token) {
        return next(new AppError('Not authorized, no token.', 401));
    }
};

/**
 * Middleware to restrict access to specific roles.
 * @param {...string} roles - List of roles that are allowed to access the route.
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(`User role ${req.user.role} is not authorized to access this route.`, 403)
            );
        }
        next();
    };
};
```
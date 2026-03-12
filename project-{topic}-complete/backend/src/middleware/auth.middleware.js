const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errorHandler');
const logger = require('./logger');

const authenticateToken = (req, res, next) => {
    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
        logger.warn('Authentication attempt without token.');
        return next(new AppError('Unauthorized - No token provided', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user payload to request
        next();
    } catch (error) {
        logger.error(`Token verification failed: ${error.message}`);
        return next(new AppError('Unauthorized - Invalid token', 401));
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            logger.warn(`Forbidden access attempt by user ${req.user ? req.user.id : 'N/A'} (Role: ${req.user ? req.user.role : 'N/A'}) to restricted resource.`);
            return next(new AppError('Forbidden - Insufficient permissions', 403));
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
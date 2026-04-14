```javascript
const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const config = require('../config');
const AppError = require('../utils/AppError');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

const verifyToken = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication token missing');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.sub);

    if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'User belonging to this token no longer exists');
    }

    req.user = user; // Attach user to request object
    next();
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to perform this action');
        }
        next();
    };
};

module.exports = {
    verifyToken,
    authorize,
};
```
```javascript
// src/middlewares/auth.js
const passport = require('passport');
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const { roles } = require('../config/roles');
const config = require('../config/config');

const verifyCallback = (req, resolve, reject, requiredRoles) => async (err, user, info) => {
    // ALX Principle: Authentication and Authorization
    // Verify user identity and check if they have the necessary permissions (roles).
    if (err || info || !user) {
        return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
    req.user = user; // Attach user object to request

    if (requiredRoles.length) {
        const userRole = user.role; // Assuming user object has a 'role' field
        if (!userRole || !requiredRoles.includes(userRole)) {
            return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not have the required permissions.'));
        }
    }

    resolve();
};

const auth = (...requiredRoles) => async (req, res, next) => {
    return new Promise((resolve, reject) => {
        // Use Passport.js with JWT strategy
        passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRoles))(req, res, next);
    })
        .then(() => next())
        .catch((err) => next(err));
};

module.exports = auth;
```
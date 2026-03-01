```javascript
// src/services/token.service.js
const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const config = require('../config/config');
const userService = require('./user.service');
const { Token } = require('../models');
const { ApiError } = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const logger = require('../utils/logger');

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
    // ALX Principle: Cryptographic Token Generation
    // Use JWT for secure, signed tokens with appropriate expiration.
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, blacklisted = false) => {
    const tokenDoc = await Token.create({
        token,
        userId,
        expires: expires.toDate(),
        type,
        blacklisted,
    });
    return tokenDoc;
};

const verifyToken = async (token, type) => {
    try {
        const payload = jwt.verify(token, config.jwt.secret);
        const tokenDoc = await Token.findOne({
            where: { token, type, userId: payload.sub, blacklisted: false },
        });
        if (!tokenDoc) {
            throw new Error('Token not found');
        }
        return tokenDoc;
    } catch (error) {
        logger.warn(`Token verification failed for type ${type}: ${error.message}`);
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }
};

const generateAuthTokens = async (user) => {
    // ALX Principle: Token Management
    // Generate both access and refresh tokens, store refresh token securely.
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
    await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
};

module.exports = {
    generateToken,
    saveToken,
    verifyToken,
    generateAuthTokens,
};
```
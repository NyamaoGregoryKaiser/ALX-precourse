```javascript
// src/services/auth.service.js
const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const { ApiError } = require('../utils/ApiError');

const loginUserWithEmailAndPassword = async (email, password) => {
    const user = await userService.getUserByEmail(email);
    // ALX Principle: Secure Password Handling
    // Compare hashed passwords, do not store plain text. Use bcrypt for robust hashing.
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }
    return user;
};

const logout = async (refreshToken) => {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, 'refresh');
    if (!refreshTokenDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
    }
    await refreshTokenDoc.destroy();
};

module.exports = {
    loginUserWithEmailAndPassword,
    logout,
};
```
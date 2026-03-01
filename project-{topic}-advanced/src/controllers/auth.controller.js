```javascript
// src/controllers/auth.controller.js
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService } = require('../services');

const register = catchAsync(async (req, res) => {
    // ALX Principle: Input Validation and Sanitization
    // Joi middleware handles schema validation. Controller ensures business rules.
    const user = await userService.createUser(req.body);
    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
    // ALX Principle: Secure Authentication Flow
    // Password hashing and JWT generation for secure session management.
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({ user, tokens });
});

// Example for logout (not in routes, but common)
const logout = catchAsync(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
    register,
    login,
    logout,
};
```
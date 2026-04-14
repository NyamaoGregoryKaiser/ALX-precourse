```javascript
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');

const generateAuthTokens = (user) => {
    const accessToken = jwt.sign(
        { sub: user.id, role: user.role },
        config.jwt.secret,
        { expiresIn: `${config.jwt.accessExpirationMinutes}m` }
    );
    // In a real app, you'd also generate a refresh token and store it securely
    return { accessToken };
};

const register = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body;

    if (await User.findByEmail(email)) {
        throw new AppError(httpStatus.CONFLICT, 'Email already taken');
    }

    const newUser = await User.create(username, email, password, role || 'user');
    const { accessToken } = generateAuthTokens(newUser);

    res.status(httpStatus.CREATED).send(new ApiResponse(httpStatus.CREATED, { user: newUser, token: accessToken }, 'User registered successfully'));
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user || !(await User.comparePassword(password, user.password_hash))) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }

    const { accessToken } = generateAuthTokens(user);
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, { user: { id: user.id, username: user.username, email: user.email, role: user.role }, token: accessToken }, 'Logged in successfully'));
});

module.exports = {
    register,
    login,
};
```
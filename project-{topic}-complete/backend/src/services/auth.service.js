const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userService = require('./user.service');
const { AppError } = require('../utils/errorHandler');
const logger = require('../middleware/logger');

const generateAuthToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
};

const registerUser = async (username, email, password, role = 'user') => {
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
        throw new AppError('User with this email already exists', 409); // Conflict
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userService.createUser(username, email, hashedPassword, role);
    logger.info(`New user registered: ${newUser.email}`);
    return newUser;
};

const loginUser = async (email, password) => {
    const user = await userService.findUserByEmail(email);
    if (!user) {
        throw new AppError('Invalid credentials', 401); // Unauthorized
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 401);
    }

    const token = generateAuthToken(user);
    logger.info(`User logged in: ${user.email}`);
    return { user, token };
};

module.exports = {
    registerUser,
    loginUser,
    generateAuthToken
};
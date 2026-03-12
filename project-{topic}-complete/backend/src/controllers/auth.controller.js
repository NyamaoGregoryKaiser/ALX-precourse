const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const logger = require('../middleware/logger');
const { AppError } = require('../utils/errorHandler');

const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            throw new AppError('Username, email, and password are required', 400);
        }

        const newUser = await authService.registerUser(username, email, password);
        res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new AppError('Email and password are required', 400);
        }

        const { user, token } = await authService.loginUser(email, password);

        // Set JWT as a secure, HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            sameSite: 'Strict', // CSRF protection
            maxAge: 3600000 // 1 hour
        });

        res.status(200).json({
            message: 'Logged in successfully',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        next(error);
    }
};

const logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

const getProfile = async (req, res, next) => {
    try {
        // req.user is populated by authMiddleware
        const user = await userService.findUserById(req.user.id);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        });
    } catch (error) {
        logger.error(`Error fetching user profile for ID ${req.user.id}: ${error.message}`);
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile
};
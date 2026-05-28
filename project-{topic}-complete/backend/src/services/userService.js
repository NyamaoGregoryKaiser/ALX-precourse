```javascript
const { User, Cart } = require('../config/db');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const { generateToken } = require('../utils/jwt');

/**
 * Service for User related business logic.
 */
class UserService {
    /**
     * Registers a new user.
     * @param {Object} userData - User data (username, email, password).
     * @returns {Object} User object and JWT token.
     */
    static async registerUser(userData) {
        const { username, email, password } = userData;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new AppError('User with that email already exists', 400);
        }

        const user = await User.create({ username, email, password });

        // Create a cart for the new user
        await Cart.create({ userId: user.id });

        const token = generateToken(user.id);
        logger.info(`New user registered: ${user.email}`);
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        };
    }

    /**
     * Authenticates a user and generates a JWT.
     * @param {string} email - User's email.
     * @param {string} password - User's password.
     * @returns {Object} User object and JWT token.
     */
    static async loginUser(email, password) {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        const token = generateToken(user.id);
        logger.info(`User logged in: ${user.email}`);
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        };
    }

    /**
     * Gets a user by ID.
     * @param {string} userId - ID of the user.
     * @returns {Object} User object.
     */
    static async getUserById(userId) {
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }

    /**
     * Updates a user's profile.
     * @param {string} userId - ID of the user.
     * @param {Object} updateData - Data to update.
     * @returns {Object} Updated user object.
     */
    static async updateUserProfile(userId, updateData) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Only allow certain fields to be updated by a user
        const allowedUpdates = ['username', 'email'];
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                user[key] = updateData[key];
            }
        });

        await user.save();
        logger.info(`User profile updated for user ID: ${userId}`);
        // Return user without password
        const { password, ...userWithoutPassword } = user.toJSON();
        return userWithoutPassword;
    }

    /**
     * Changes a user's password.
     * @param {string} userId - ID of the user.
     * @param {string} currentPassword - User's current password.
     * @param {string} newPassword - User's new password.
     */
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new AppError('Current password is incorrect', 401);
        }

        user.password = newPassword; // Hash will be done by hook
        await user.save();
        logger.info(`User password changed for user ID: ${userId}`);
    }

    /**
     * Deletes a user (Admin only).
     * @param {string} userId - ID of the user to delete.
     */
    static async deleteUser(userId) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        await user.destroy();
        logger.info(`User deleted: ${userId}`);
    }
}

module.exports = UserService;
```
```javascript
const UserService = require('../services/userService');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Controller for user authentication and profile management.
 */
class UserController {
    /**
     * Registers a new user.
     * POST /api/v1/auth/register
     */
    static async register(req, res, next) {
        try {
            const { username, email, password } = req.body;

            // Basic validation
            if (!username || !email || !password) {
                return next(new AppError('Please enter all required fields: username, email, password.', 400));
            }

            const { user, token } = await UserService.registerUser({ username, email, password });
            res.status(201).json({
                status: 'success',
                message: 'User registered successfully.',
                data: { user, token }
            });
        } catch (error) {
            logger.error(`Error during user registration: ${error.message}`);
            next(error);
        }
    }

    /**
     * Logs in a user.
     * POST /api/v1/auth/login
     */
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Basic validation
            if (!email || !password) {
                return next(new AppError('Please enter email and password.', 400));
            }

            const { user, token } = await UserService.loginUser(email, password);
            res.status(200).json({
                status: 'success',
                message: 'Logged in successfully.',
                data: { user, token }
            });
        } catch (error) {
            logger.error(`Error during user login: ${error.message}`);
            next(error);
        }
    }

    /**
     * Gets the profile of the currently authenticated user.
     * GET /api/v1/users/profile
     */
    static async getMyProfile(req, res, next) {
        try {
            const user = await UserService.getUserById(req.user.id);
            res.status(200).json({
                status: 'success',
                data: { user }
            });
        } catch (error) {
            logger.error(`Error getting user profile for user ID ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Updates the profile of the currently authenticated user.
     * PUT /api/v1/users/profile
     */
    static async updateMyProfile(req, res, next) {
        try {
            const updatedUser = await UserService.updateUserProfile(req.user.id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully.',
                data: { user: updatedUser }
            });
        } catch (error) {
            logger.error(`Error updating user profile for user ID ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Changes the password of the currently authenticated user.
     * PATCH /api/v1/users/change-password
     */
    static async changeMyPassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return next(new AppError('Please provide current password and new password.', 400));
            }

            await UserService.changePassword(req.user.id, currentPassword, newPassword);
            res.status(200).json({
                status: 'success',
                message: 'Password updated successfully.'
            });
        } catch (error) {
            logger.error(`Error changing password for user ID ${req.user.id}: ${error.message}`);
            next(error);
        }
    }

    /**
     * Gets all users (Admin only).
     * GET /api/v1/admin/users
     */
    static async getAllUsers(req, res, next) {
        try {
            // This method would be in UserService, and we'd need to implement pagination/filtering
            const users = await UserService.getAllUsers(); // Placeholder, needs actual implementation
            res.status(200).json({
                status: 'success',
                results: users.length,
                data: { users }
            });
        } catch (error) {
            logger.error(`Error fetching all users (Admin): ${error.message}`);
            next(error);
        }
    }

    /**
     * Deletes a user by ID (Admin only).
     * DELETE /api/v1/admin/users/:id
     */
    static async deleteUser(req, res, next) {
        try {
            await UserService.deleteUser(req.params.id);
            res.status(204).json({
                status: 'success',
                data: null
            });
        } catch (error) {
            logger.error(`Error deleting user ID ${req.params.id} (Admin): ${error.message}`);
            next(error);
        }
    }
}

module.exports = UserController;
```
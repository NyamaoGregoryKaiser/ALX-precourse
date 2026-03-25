import { Request, Response } from 'express';
import userService from '../services/userService';
import { CustomError } from '../middleware/errorHandler';
import logger from '../config/logger';

class UserController {
    async getMyProfile(req: Request, res: Response) {
        const userId = req.user?.id;

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        const user = await userService.getUserProfile(userId);
        res.status(200).json(user);
        logger.debug(`Accessed own profile for user: ${userId}`);
    }

    async updateMyProfile(req: Request, res: Response) {
        const userId = req.user?.id;
        const { username, email } = req.body;

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        if (!username && !email) {
            throw new CustomError('At least one field (username or email) is required for update.', 400, 'NO_UPDATE_FIELDS');
        }

        const updatedUser = await userService.updateUserProfile(userId, { username, email });
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                isOnline: updatedUser.isOnline,
            },
        });
        logger.info(`User profile updated for user: ${userId}`);
    }

    async getAllUsers(req: Request, res: Response) {
        const userId = req.user?.id; // Current authenticated user

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        const users = await userService.getAllUsers(userId);
        res.status(200).json(users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            isOnline: user.isOnline,
        })));
        logger.debug(`Fetched all users by ${userId}`);
    }
}

export default new UserController();
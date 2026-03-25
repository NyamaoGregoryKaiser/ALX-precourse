import { Request, Response } from 'express';
import authService from '../services/authService';
import { CustomError } from '../middleware/errorHandler';
import logger from '../config/logger';

class AuthController {
    async register(req: Request, res: Response) {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new CustomError('Username, email, and password are required for registration.', 400, 'MISSING_CREDENTIALS');
        }

        const { accessToken, refreshToken, user } = await authService.register(username, email, password);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
            accessToken,
            refreshToken,
        });
        logger.http(`User registered: ${user.email}`);
    }

    async login(req: Request, res: Response) {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new CustomError('Email and password are required for login.', 400, 'MISSING_CREDENTIALS');
        }

        const { accessToken, refreshToken, user } = await authService.login(email, password);

        res.status(200).json({
            message: 'Logged in successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
            accessToken,
            refreshToken,
        });
        logger.http(`User logged in: ${user.email}`);
    }

    async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;
        const userId = req.user?.id; // Authenticated user ID from middleware

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }
        if (!refreshToken) {
            throw new CustomError('Refresh token is required.', 400, 'MISSING_REFRESH_TOKEN');
        }

        const { accessToken } = await authService.refreshToken(userId, refreshToken);

        res.status(200).json({
            message: 'Access token refreshed successfully',
            accessToken,
        });
        logger.http(`Access token refreshed for user: ${userId}`);
    }

    async logout(req: Request, res: Response) {
        const userId = req.user?.id;

        if (!userId) {
            throw new CustomError('User ID not found in request context. Authentication middleware error.', 500, 'AUTH_CONTEXT_ERROR');
        }

        await authService.logout(userId);

        res.status(200).json({ message: 'Logged out successfully.' });
        logger.http(`User logged out: ${userId}`);
    }
}

export default new AuthController();
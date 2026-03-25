import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { CustomError } from './errorHandler';
import logger from '../config/logger';

interface JwtPayload {
    userId: string;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        throw new CustomError('Authentication token missing.', 401, 'AUTH_TOKEN_MISSING');
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logger.error('JWT_SECRET is not defined in environment variables.');
            throw new CustomError('Server configuration error.', 500, 'SERVER_ERROR');
        }

        const decoded = jwt.verify(token, secret) as JwtPayload;

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: decoded.userId });

        if (!user) {
            throw new CustomError('User not found.', 401, 'AUTH_USER_NOT_FOUND');
        }

        req.user = user; // Attach user object to the request
        next();
    } catch (error: any) {
        logger.error(`Authentication error: ${error.message}`, { error });
        if (error instanceof jwt.TokenExpiredError) {
            throw new CustomError('Authentication token expired.', 401, 'AUTH_TOKEN_EXPIRED');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new CustomError('Invalid authentication token.', 401, 'AUTH_TOKEN_INVALID');
        } else if (error instanceof CustomError) {
            throw error; // Re-throw custom errors
        }
        throw new CustomError('Failed to authenticate token.', 401, 'AUTH_FAILED');
    }
};

export const authorizeRoles = (roles: string[]) => { // Example for future role-based authorization
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new CustomError('User not authenticated.', 401, 'AUTH_REQUIRED');
        }
        // Assuming user has a 'role' property, e.g., req.user.role
        // if (!roles.includes(req.user.role)) {
        //     throw new CustomError('Forbidden: Insufficient permissions.', 403, 'FORBIDDEN');
        // }
        // For now, all authenticated users are implicitly authorized.
        next();
    };
};
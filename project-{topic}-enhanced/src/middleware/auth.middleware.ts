```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * @file Authentication and authorization middleware.
 *
 * This module provides middleware functions for:
 * - `authenticateToken`: Verifying JWT tokens and attaching user information to the request.
 * - `authorizeRoles`: Restricting access to routes based on user roles.
 */

// Extend the Request type to include user information
declare module 'express' {
  interface Request {
    user?: User;
  }
}

/**
 * Middleware to authenticate JWT token from the Authorization header.
 * Attaches the authenticated user to `req.user`.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    logger.warn('Authentication failed: No token provided.');
    return next(new AppError('Authentication token required', 401));
  }

  try {
    const decoded = jwt.verify(token, environment.jwtSecret) as { userId: string, role: string };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.userId } });

    if (!user) {
      logger.warn(`Authentication failed: User with ID ${decoded.userId} not found.`);
      return next(new AppError('Invalid token: User not found', 403));
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Authentication failed due to token verification error:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token expired', 401));
    }
    return next(new AppError('Invalid authentication token', 403));
  }
};

/**
 * Middleware to authorize access based on user roles.
 *
 * @param {Array<'admin' | 'user'>} roles - An array of allowed roles.
 * @returns {Function} Express middleware function.
 */
export const authorizeRoles = (roles: Array<'admin' | 'user'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.error('Authorization failed: No user attached to request. (Missing authenticateToken?)');
      return next(new AppError('Unauthorized: User not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed for user ${req.user.username}: Role '${req.user.role}' not in allowed roles [${roles.join(', ')}].`);
      return next(new AppError('Forbidden: You do not have permission to access this resource', 403));
    }

    next();
  };
};
```
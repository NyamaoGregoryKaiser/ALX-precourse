import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserRole } from '../database/entities/User.entity';
import logger from '../utils/logger';

/**
 * Middleware to authenticate requests using JWT.
 * Attaches user information to `req.user` if token is valid.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token missing or malformed.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token); // Throws AppError if invalid
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error: any) {
    logger.warn(`Authentication failed: ${error.message}`);
    // Pass custom AppErrors directly, or wrap other errors
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Unauthorized access.', 401));
    }
  }
};

/**
 * Middleware to authorize requests based on user roles.
 * Requires `authenticate` middleware to be run first.
 * @param allowedRoles An array of roles that are permitted to access the route.
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        // This should ideally not happen if 'authenticate' runs before 'authorize'
        throw new AppError('User not authenticated.', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError('Forbidden: You do not have permission to access this resource.', 403);
      }
      next();
    } catch (error: any) {
      logger.warn(`Authorization failed for user ${req.user?.id} (role: ${req.user?.role}): ${error.message}`);
      // Pass custom AppErrors directly, or wrap other errors
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Authorization failed.', 403));
      }
    }
  };
};
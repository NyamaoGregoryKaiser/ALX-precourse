import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { CustomError } from './error.middleware';

// Extend the Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('No token provided or token format is incorrect.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    next(new CustomError(error.message || 'Unauthorized', error.statusCode || 401));
  }
};

/**
 * Middleware to authorize requests based on user roles.
 * @param roles - An array of roles allowed to access the route.
 */
export const authorizeRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Unauthorized - User not found in request.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new CustomError('Forbidden - Insufficient permissions.', 403));
    }
    next();
  };
};
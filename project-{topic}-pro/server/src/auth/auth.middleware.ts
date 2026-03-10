import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { CustomError } from '../utils/error';
import { User } from '../database/entities/User';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: User | false, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      let message = 'Unauthorized';
      if (info && info.name === 'TokenExpiredError') {
        message = 'Token expired';
      } else if (info && info.name === 'JsonWebTokenError') {
        message = 'Invalid token';
      }
      return next(new CustomError(message, 401));
    }
    req.user = user;
    next();
  })(req, res, next);
};

export const authorizeRoles = (roles: string[]) => {
  // For now, roles are not implemented in User entity, but this middleware provides the structure.
  // Example: user.role === 'admin'
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('User not authenticated', 401));
    }
    // if (!roles.includes(req.user.role)) { // Example check if user had a role
    //   return next(new CustomError('Forbidden', 403));
    // }
    next();
  };
};
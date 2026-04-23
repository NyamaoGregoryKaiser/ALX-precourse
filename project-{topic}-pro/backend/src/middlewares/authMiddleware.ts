import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { AppError } from './errorHandler';
import { UserRole } from '../entities/User';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    return next(new AppError('Invalid token or token expired. Please log in again.', 401));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
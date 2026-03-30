import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';
import { ForbiddenError } from './errorHandler';

export const authorize = (roles: UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // This should ideally be caught by authenticateToken middleware before this one
      return next(new ForbiddenError('Access denied: User not authenticated'));
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Forbidden: Insufficient permissions'));
    }

    next();
  };
};

export const authorizeSelfOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ForbiddenError('Access denied: User not authenticated'));
  }

  const resourceId = req.params.id; // Assuming resource ID is in params.id

  if (req.user.role === UserRole.ADMIN || req.user.id === resourceId) {
    next();
  } else {
    return next(new ForbiddenError('Forbidden: Insufficient permissions'));
  }
};
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { UserRole } from '../entities/User';
import { UnauthorizedError, ForbiddenError } from './errorHandler.middleware';
import logger from '../utils/logger';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Not authorized, no token'));
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles,
    };
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return next(new UnauthorizedError('Not authorized, token failed'));
  }
};

export const authorize = (roles: UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('No user attached to request. Ensure `protect` middleware is used.'));
    }

    const hasPermission = roles.some((role) => req.user?.roles.includes(role));
    if (!hasPermission) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
};

// Middleware to check API key for service data submission
export const serviceAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return next(new UnauthorizedError('Missing X-API-Key header'));
  }

  // Store the apiKey in request for later use by the dataPoint service
  (req as any).apiKey = apiKey;
  next();
};
```
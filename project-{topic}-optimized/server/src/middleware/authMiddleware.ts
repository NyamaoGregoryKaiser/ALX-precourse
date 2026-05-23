import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source';
import { User } from '../modules/auth/entities/User';
import config from '../config';
import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
import { AuthTokenPayload } from '../types';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('Authentication failed: No token provided');
    return next(new UnauthorizedError('Not authorized, no token'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      logger.warn(`Authentication failed: User with ID ${decoded.id} not found`);
      return next(new UnauthorizedError('Not authorized, user not found'));
    }

    // Attach user to the request object
    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Token verification failed:', error.message);
    return next(new UnauthorizedError('Not authorized, token failed'));
  }
};

export const authorizeMiddleware = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn(`Authorization failed for user ${req.user?.username} (Role: ${req.user?.role}): Required roles: ${roles.join(', ')}`);
      return next(new UnauthorizedError(`User role ${req.user?.role} is not authorized to access this route.`));
    }
    next();
  };
};
```
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import config from '../config';
import ApiError from '../utils/ApiError';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import { AuthenticatedRequest, AuthPayload } from '../types';
import { cache } from '../utils/cache';
import logger from '../utils/logger';

const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer TOKEN"

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication token not found');
    }

    const cachedToken = await cache.get<string>(`jwt:${token}`);
    if (cachedToken === 'blacklisted') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token is blacklisted');
    }

    const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;

    const user = await AppDataSource.getRepository(User).findOneBy({ id: payload.userId });

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found for this token');
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error.message);
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token'));
    } else if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication failed'));
    }
  }
};

const authorize = (...roles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to perform this action');
    }
    next();
  };

export { authenticate, authorize };
```
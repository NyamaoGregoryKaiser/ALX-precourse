```typescript
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient, User } from '@prisma/client';
import config from '../config';
import { ApiError } from './errorHandler';
import { AuthenticatedRequest, JwtPayload } from '../types';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('Authentication failed: No token provided');
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication failed: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      logger.warn(`Authentication failed: User with ID ${decoded.id} not found`);
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication failed: User not found'));
    }

    req.user = user as User; // Attach user object to the request
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`Authentication failed: Invalid token - ${error.message}`);
      return next(new ApiError(StatusCodes.UNAUTHORIZED, `Authentication failed: Invalid token - ${error.message}`));
    }
    logger.error('Authentication error:', error);
    return next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Authentication failed'));
  }
};
```
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, HttpCode } from '../utils/app-error';
import { logger } from '../utils/logger';
import { prisma } from '../database/prisma-client';

// Extend the Request type to include `user`
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    // 1) Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) { // For cases where JWT might be sent via cookie (less common for mobile API)
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', HttpCode.UNAUTHORIZED));
    }

    // 2) Verify token
    const decoded: any = jwt.verify(token, env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, passwordChangedAt: true }
    });

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', HttpCode.UNAUTHORIZED));
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt((currentUser.passwordChangedAt.getTime() / 1000).toString(), 10);
      if (decoded.iat && decoded.iat < changedTimestamp) {
        return next(new AppError('User recently changed password! Please log in again.', HttpCode.UNAUTHORIZED));
      }
    }

    // 5) Grant access to protected route
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    };
    next();
  } catch (err: any) {
    logger.error('Authentication error:', err.message);
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please log in again!', HttpCode.UNAUTHORIZED));
    }
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Your token has expired! Please log in again.', HttpCode.UNAUTHORIZED));
    }
    return next(new AppError('Authentication failed', HttpCode.INTERNAL_SERVER_ERROR));
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', HttpCode.FORBIDDEN));
    }
    next();
  };
};
```
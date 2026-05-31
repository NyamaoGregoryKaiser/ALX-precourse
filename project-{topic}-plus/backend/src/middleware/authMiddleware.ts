import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/appError';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * Middleware to protect routes: verifies JWT and attaches user to request.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1) Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', StatusCodes.UNAUTHORIZED));
  }

  // 2) Verify token
  let decoded: JwtPayload;
  try {
    decoded = verifyToken(token);
  } catch (error: any) {
    // verifyToken throws specific AppErrors for expired/invalid tokens
    return next(error);
  }

  // 3) Check if user still exists
  const currentUser = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', StatusCodes.UNAUTHORIZED));
  }

  // 4) Grant access to protected route
  // Attach user information (excluding sensitive data like password) to the request
  req.user = {
    id: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
  };
  next();
};

/**
 * Middleware to restrict access based on user roles.
 * @param roles An array of roles allowed to access the route.
 */
export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // This should ideally not happen if 'protect' middleware runs before 'restrictTo'
      return next(new AppError('User not authenticated.', StatusCodes.FORBIDDEN));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', StatusCodes.FORBIDDEN)
      );
    }

    next();
  };
};
```
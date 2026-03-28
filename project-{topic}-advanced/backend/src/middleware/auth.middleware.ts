import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { CustomError } from '../utils/errors.util';
import { config } from '../config/env.config';

const prisma = new PrismaClient();

// Extend the Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new CustomError('Not authorized, no token', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true } // Select only necessary fields
    });

    if (!user) {
      return next(new CustomError('User not found for this token', 401));
    }

    req.user = user; // Attach user to the request object
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new CustomError('Token has expired', 401));
    }
    return next(new CustomError('Not authorized, token failed', 401));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('No user attached to request, authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new CustomError(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};
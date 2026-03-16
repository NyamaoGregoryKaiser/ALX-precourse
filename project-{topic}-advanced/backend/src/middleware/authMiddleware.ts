import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomError } from './errorHandler';
import { UserRole } from '../db/entities/User';

interface DecodedToken {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return next(new CustomError('Authentication token required', 401));
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
    if (err) {
      return next(new CustomError('Invalid or expired token', 403));
    }
    req.user = user as DecodedToken;
    next();
  });
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new CustomError('Forbidden: You do not have permission to access this resource', 403));
    }
    next();
  };
};
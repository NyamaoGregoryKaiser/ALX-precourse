```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/data-source';
import { User } from '../modules/users/user.entity';
import { UnauthorizedError, ForbiddenError } from '../utils/appErrors';
import { config } from '../config';

// Extend Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to protect routes: Checks for valid JWT and attaches user to request.
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1) Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('You are not logged in! Please log in to get access.'));
  }

  try {
    // 2) Verify token
    const decoded: any = jwt.verify(token, config.JWT.SECRET);

    // 3) Check if user still exists
    const userRepository = AppDataSource.getRepository(User);
    const currentUser = await userRepository.findOne({
      where: { id: decoded.id },
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt'] // Select specific fields, avoid password
    });

    if (!currentUser) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }

    // 4) Attach user to request
    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Your token has expired! Please log in again.'));
    }
    return next(new UnauthorizedError('Invalid token! Please log in again.'));
  }
};

/**
 * Middleware to restrict access to specific roles.
 * @param roles - An array of roles that are allowed to access the route (e.g., ['admin', 'seller'])
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // This should ideally not happen if 'protect' middleware is used before 'authorize'
      return next(new UnauthorizedError('User not authenticated.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
};
```
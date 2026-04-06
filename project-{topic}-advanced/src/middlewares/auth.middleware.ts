```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError';
import { JWT_SECRET } from '../config/jwt';
import { prisma } from '../utils/prisma';
import { UserRole } from '@prisma/client';

// Extend the Request interface to include user information
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

interface JwtPayload {
  id: string;
  role: UserRole;
}

/**
 * Middleware to authenticate user via JWT token.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Authentication failed: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true }, // Select only necessary fields
    });

    if (!user) {
      return next(new ApiError(401, 'Authentication failed: User not found'));
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    return next(new ApiError(401, 'Authentication failed: Invalid token'));
  }
};

/**
 * Middleware to authorize user based on roles.
 * @param roles An array of allowed roles (e.g., [UserRole.ADMIN, UserRole.USER])
 */
export const authorize = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(403, 'Authorization failed: User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Authorization failed: Insufficient permissions'));
    }
    next();
  };
};
```
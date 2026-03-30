import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { ApiError } from '../utils/ApiError';
import httpStatus from 'http-status';
import { UserRole } from '../entities/User';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing or invalid.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: UserRole };
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token expired.'));
    }
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid authentication token.'));
  }
};

export const authorize = (requiredRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'User not authenticated.'));
  }

  if (!requiredRoles.includes(req.user.role)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to perform this action.'));
  }

  next();
};
```

#### `backend/src/middleware/errorHandler.ts` (Centralized error handling)
```typescript
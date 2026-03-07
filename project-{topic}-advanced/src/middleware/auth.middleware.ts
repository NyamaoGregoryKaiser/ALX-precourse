```typescript
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AuthenticatedRequest, DecodedToken } from '../interfaces/auth.interface';
import { UserRole } from '../database/entities/User';
import { CustomError } from '../interfaces/error.interface';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new CustomError(401, 'Authentication token missing.'));
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new CustomError(403, 'Invalid or expired token.'));
    }
    req.user = user as DecodedToken;
    next();
  });
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new CustomError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
};
```
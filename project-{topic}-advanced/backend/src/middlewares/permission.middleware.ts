```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { UserRole } from '../models/User.entity';
import logger from '../utils/logger';

/**
 * Middleware to authorize requests based on user roles.
 * Requires `authenticateToken` to be run before it to populate `req.user`.
 * @param allowedRoles An array of UserRoles that are permitted to access the route.
 */
export const authorizeRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      logger.warn(`Authorization failed: User role not found in token for user ${req.user?.userId || 'unknown'}.`);
      return next(new AppError('Authorization failed: User role not provided or found.', 403));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.userId} with role '${req.user.role}' attempted to access forbidden resource. Required roles: [${allowedRoles.join(', ')}].`);
      return next(new AppError(`Forbidden: Requires one of roles: [${allowedRoles.join(', ')}]`, 403));
    }
    next(); // User has required role, proceed to next middleware/controller
  };
};
```
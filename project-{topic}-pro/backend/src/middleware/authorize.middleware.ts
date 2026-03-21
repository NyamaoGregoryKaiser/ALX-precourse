```typescript
import { Request, Response, NextFunction } from 'express';
import AppError, { ErrorType } from '@utils/AppError';
import { UserRole } from '@models/User';
import logger from '@config/logger';

export const authorize = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error('Authorization failed: User not found in request (auth middleware missing?)');
      return next(new AppError('Authorization failed: User not authenticated.', ErrorType.INTERNAL_SERVER_ERROR));
    }

    if (!requiredRoles.includes(req.user.role)) {
      logger.warn(`Authorization failed for user ${req.user.id} (role: ${req.user.role}). Required roles: ${requiredRoles.join(', ')}`);
      return next(new AppError('Forbidden: You do not have permission to perform this action.', ErrorType.FORBIDDEN));
    }

    next();
  };
};
```
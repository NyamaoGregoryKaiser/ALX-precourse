```typescript
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { UserRole } from '../entities/User';
import { AppError } from '../utils/appError';

export const protect = passport.authenticate('jwt', { session: false });

export const authorize = (roles: UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure req.user is set by the protect middleware
    if (!req.user) {
      return next(new AppError('Unauthorized: No user found in request after authentication', 401));
    }

    const user = req.user as any; // Cast to 'any' or define a custom Request interface for user

    if (roles.length && !roles.includes(user.role)) {
      return next(new AppError('Forbidden: You do not have permission to perform this action', 403));
    }

    next();
  };
};

// Middleware to check ownership for dashboards/charts
export const checkOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction,
  repository: any // TypeORM repository
) => {
  try {
    const user = req.user as any;
    const resourceId = req.params.id;

    if (!user || !user.id) {
      return next(new AppError('Unauthorized: User not authenticated.', 401));
    }

    const resource = await repository.findOne({ where: { id: resourceId } });

    if (!resource) {
      return next(new AppError('Resource not found.', 404));
    }

    if (resource.userId !== user.id && user.role !== UserRole.ADMIN) {
      return next(new AppError('Forbidden: You do not own this resource.', 403));
    }

    req.resource = resource; // Attach resource to request for subsequent middleware/controller
    next();
  } catch (error: any) {
    next(new AppError(`Error checking ownership: ${error.message}`, 500));
  }
};
```
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { CustomError } from '../utils/error';

// Extend the Request type to include `user`
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to authenticate JWT token.
 * Populates req.user if token is valid.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Authentication invalid: No token provided or malformed.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new CustomError('Authentication invalid: No token provided.', 401);
    }

    const payload = jwt.verify(token, config.jwt.secret) as { id: string, email: string, role: UserRole };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: payload.id });

    if (!user) {
      throw new CustomError('Authentication invalid: User not found.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new CustomError('Authentication invalid: Invalid token.', 401));
    }
    next(error); // Pass other errors to the error handling middleware
  }
};

/**
 * Middleware to authorize user roles.
 * @param roles An array of roles allowed to access the route.
 */
export const authorize = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // This should ideally not happen if 'authenticate' middleware runs before 'authorize'
      return next(new CustomError('Authorization failed: User not authenticated.', 403));
    }

    if (!roles.includes(req.user.role)) {
      return next(new CustomError('Authorization failed: Insufficient permissions.', 403));
    }

    next();
  };
};
```

#### `backend/src/middleware/error.middleware.ts`
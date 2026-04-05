```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../auth/jwt.utils';
import { AppDataSource } from '../database/data-source';
import { User, UserRole } from '../entities/User.entity';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';

export interface AuthRequest extends Request {
  user?: User; // Add user property to Request object
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = verifyJwtToken(token);

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decodedToken.userId } });

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
    }

    req.user = user; // Attach user to the request object
    next();
  } catch (error: any) {
    next(ApiError.fromError(error, StatusCodes.UNAUTHORIZED, 'Invalid or expired token'));
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'Authorization failed: User not authenticated.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'Authorization failed: Insufficient permissions.'));
    }

    next();
  };
};
```
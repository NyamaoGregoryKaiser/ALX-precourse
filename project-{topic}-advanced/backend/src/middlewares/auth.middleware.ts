```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import logger from '../utils/logger';

// Extend the Request object to include the user payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using a JWT from the Authorization header.
 * Attaches the decoded user payload to `req.user` if successful.
 * Throws AppError (401 or 403) if token is missing, invalid, or expired.
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer TOKEN"

  if (token == null) {
    logger.warn('Authentication attempt failed: No token provided.');
    return next(new AppError('Authentication token missing', 401));
  }

  try {
    const user = verifyAccessToken(token);
    req.user = user; // Attach user payload to request for subsequent middlewares/controllers
    next();
  } catch (error: any) {
    logger.error('Authentication attempt failed: Invalid or expired token.', error);
    if (error instanceof AppError) {
      return next(error); // Re-throw AppError from verifyAccessToken
    }
    return next(new AppError('Authentication failed: Invalid token.', 403));
  }
};
```
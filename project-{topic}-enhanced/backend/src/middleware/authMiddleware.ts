```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { config } from '../config';
import logger from '../utils/logger';

// Extend Request type to include user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: User; // Add the user property to the Request object
  }
}

/**
 * Middleware to authenticate user requests using JWT.
 * It verifies the token and attaches the authenticated user to the request object.
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    logger.warn('Authentication failed: No token provided.');
    return res.status(401).json({ message: 'Authentication failed: No token provided' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string; iat: number; exp: number };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: payload.userId });

    if (!user) {
      logger.warn(`Authentication failed: User not found for userId: ${payload.userId}`);
      return res.status(403).json({ message: 'Authentication failed: User not found' });
    }

    req.user = user; // Attach user to request object
    logger.info(`User authenticated: ${user.email}`);
    next();
  } catch (error: any) {
    logger.error(`Authentication failed: Invalid token. Error: ${error.message}`);
    return res.status(403).json({ message: 'Authentication failed: Invalid or expired token' });
  }
};

/**
 * Middleware to authorize user based on their role.
 * Requires `authenticateToken` to be run first.
 * @param roles An array of roles that are allowed to access the route.
 * @returns Express middleware function.
 */
export const authorizeRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error('Authorization failed: No user attached to request (authenticateToken middleware missing?).');
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.email} (role: ${req.user.role}) attempted to access restricted resource. Required roles: ${roles.join(', ')}`);
      return res.status(403).json({ message: `Forbidden: Requires one of the following roles: ${roles.join(', ')}` });
    }

    logger.debug(`User ${req.user.email} authorized for role(s): ${roles.join(', ')}`);
    next();
  };
};
```
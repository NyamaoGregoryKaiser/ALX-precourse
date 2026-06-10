```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database/config/data-source';
import { User, UserRole } from '../database/entities/User';
import { env } from '../config/env.config';
import { logger } from '../shared/utils/logger';

// Extend the Request object to include user information
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    logger.warn('Authentication attempt without token');
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string; role: UserRole };
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: decoded.userId });

    if (!user) {
      logger.warn(`User not found for token: ${decoded.userId}`);
      return res.status(403).json({ message: 'Invalid authentication token' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Error verifying token:', err instanceof Error ? err.message : err);
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Authentication token expired' });
    }
    return res.status(403).json({ message: 'Invalid or malformed authentication token' });
  }
};

export const authorizeRole = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error('Authorization attempt without authenticated user context.');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      logger.warn(`User ${req.user.email} (role: ${req.user.role}) attempted to access restricted resource.`);
      return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions' });
    }
    next();
  };
};
```
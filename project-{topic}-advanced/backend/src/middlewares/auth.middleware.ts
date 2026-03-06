```typescript
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/apiErrors';
import { verifyAccessToken } from '../utils/jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserRole } from '../entities/Role';
import { BlacklistedToken } from '../entities/BlacklistedToken';
import { logger } from '../utils/logger';

// Extend the Request object to include user information
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token format invalid.');
    }

    // Check if the token is blacklisted
    const blacklistedTokenRepository = AppDataSource.getRepository(BlacklistedToken);
    const isBlacklisted = await blacklistedTokenRepository.findOne({ where: { token } });
    if (isBlacklisted) {
      throw new UnauthorizedError('Token revoked or expired. Please log in again.');
    }

    const decoded = verifyAccessToken(token); // Decodes and verifies JWT
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      relations: ['role']
    });

    if (!user) {
      throw new UnauthorizedError('User not found.');
    }

    req.user = user;
    req.token = token; // Store the actual token for potential blacklisting later
    next();
  } catch (error: any) {
    logger.error('Authentication failed:', error.message);
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ message: error.message });
    }
    // For JWT errors (e.g., TokenExpiredError, JsonWebTokenError)
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }
    next(error); // Pass other errors to the error handling middleware
  }
};

export const authorize = (requiredRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // This should ideally not happen if 'authenticate' middleware runs before 'authorize'
      throw new UnauthorizedError('User not authenticated for authorization check.');
    }

    if (!req.user.role || !requiredRoles.includes(req.user.role.name)) {
      throw new ForbiddenError('You do not have permission to access this resource.');
    }

    next();
  };
};

export const verifyEmailStatus = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated for email verification check.');
  }

  if (!req.user.isEmailVerified) {
    throw new ForbiddenError('Please verify your email address to access this resource.');
  }

  next();
};
```
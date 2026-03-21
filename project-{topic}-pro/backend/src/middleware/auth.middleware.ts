```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/jwt';
import AppError, { ErrorType } from '@utils/AppError';
import { getRepository } from 'typeorm';
import { User } from '@models/User';
import logger from '@config/logger';

// Extend the Request type to include `user` property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided or malformed header');
      return next(new AppError('Authentication failed: No token provided or malformed header', ErrorType.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      logger.warn(`Authentication failed: User with ID ${decoded.id} not found.`);
      return next(new AppError('Authentication failed: User not found.', ErrorType.UNAUTHORIZED));
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error instanceof Error ? error.message : error}`);
    next(error); // Pass AppError from verifyAccessToken or any other error
  }
};
```
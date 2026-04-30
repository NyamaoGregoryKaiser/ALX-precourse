```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppDataSource } from '../config/data-source';
import { User } from '../database/entities/User';
import { UnauthorizedError } from '../utils/appErrors';

// Extend the Request object to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('No token provided.'));
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return next(new UnauthorizedError('No token provided.'));
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
        
        // Check if user still exists in DB
        const user = await AppDataSource.getRepository(User).findOneBy({ id: decoded.id });
        if (!user) {
            return next(new UnauthorizedError('User associated with token no longer exists.'));
        }

        req.userId = decoded.id;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new UnauthorizedError('Token expired.'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new UnauthorizedError('Invalid token.'));
        }
        next(new UnauthorizedError('Authentication failed.'));
    }
};
```
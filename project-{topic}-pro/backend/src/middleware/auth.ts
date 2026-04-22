```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, DecodedToken } from '../utils/jwt';
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import logger from '../utils/logger';

// Extend Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
            userId?: string; // Also add userId for convenience
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    try {
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ message: 'Not authorized, token failed verification' });
        }

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(401).json({ message: 'User belonging to this token no longer exists' });
        }

        req.user = user;
        req.userId = user.id; // Store userId for direct access
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(401).json({ message: 'Not authorized, token is invalid' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
        }
        next();
    };
};

export const isOwner = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found in request' });
    }

    const { id } = req.params; // Expecting resource ID in params

    // This middleware needs to be flexible enough to check ownership for different entities.
    // For simplicity, we'll assume it's used for Dashboards, DataSources, and Charts.
    // In a real system, you'd pass a model/repository and a user relation column name.

    try {
        let entity: any;
        let repository: any;

        // Determine which repository to use based on the route or a passed parameter
        // This is a simplified example; in a complex app, you might use a HOC or factory.
        if (req.baseUrl.includes('dashboards')) {
            repository = AppDataSource.getRepository(AppDataSource.getMetadata(AppDataSource.getRepository(Dashboard).target).target as any);
        } else if (req.baseUrl.includes('data-sources')) {
            repository = AppDataSource.getRepository(AppDataSource.getMetadata(AppDataSource.getRepository(DataSource).target).target as any);
        } else if (req.baseUrl.includes('charts')) {
            repository = AppDataSource.getRepository(AppDataSource.getMetadata(AppDataSource.getRepository(Chart).target).target as any);
        } else {
            logger.warn(`isOwner middleware used on unsupported base URL: ${req.baseUrl}`);
            return res.status(500).json({ message: 'Server error: Unsupported resource for ownership check.' });
        }

        entity = await repository.findOne({ where: { id } });

        if (!entity) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Check if the entity has a userId property and if it matches the authenticated user's ID
        if (entity.userId !== req.userId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this resource' });
        }

        next();
    } catch (error) {
        logger.error('Error in isOwner middleware:', error);
        res.status(500).json({ message: 'Server error during ownership check' });
    }
};
```
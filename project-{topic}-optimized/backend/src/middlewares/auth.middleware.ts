```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { AuthService } from '../modules/auth/auth.service';
import { UserRepository } from '../modules/users/user.repository';
import { User, UserRole } from '../database/entities/User';

// Extend the Request object to include user information
export interface AuthenticatedRequest extends Request {
    user?: User; // Or a more specific UserDTO with non-sensitive data
    token?: string;
}

const authService = new AuthService();
const userRepository = new UserRepository();

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1) Check if token is present in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    req.token = token; // Store token on request for potential later use

    // 2) Verify token and get user ID
    let userId: string;
    try {
        userId = authService.verifyToken(token);
    } catch (err) {
        return next(err); // AppError from authService.verifyToken
    }

    // 3) Check if user still exists
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4) Grant access to protected route
    // Do NOT attach sensitive data like password
    req.user = currentUser;
    next();
};

export const authorize = (roles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Authentication error: User not found in request after authentication.', 500));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action.', 403)); // Forbidden
        }
        next();
    };
};
```
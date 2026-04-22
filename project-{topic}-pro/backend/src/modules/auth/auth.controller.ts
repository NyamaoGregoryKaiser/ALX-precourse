```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import logger from '../../utils/logger';

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const newUser = await authService.registerUser(email, password);
            res.status(201).json({
                message: 'User registered successfully',
                user: { id: newUser.id, email: newUser.email, role: newUser.role }
            });
        } catch (error: any) {
            logger.error('Registration failed:', error.message);
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const { user, token } = await authService.loginUser(email, password);
            res.status(200).json({
                message: 'Login successful',
                user: { id: user.id, email: user.email, role: user.role },
                token
            });
        } catch (error: any) {
            logger.error('Login failed:', error.message);
            next(error);
        }
    }

    async getMe(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            res.status(200).json({
                user: { id: req.user.id, email: req.user.email, role: req.user.role }
            });
        } catch (error: any) {
            logger.error('Get user details failed:', error.message);
            next(error);
        }
    }
}
```
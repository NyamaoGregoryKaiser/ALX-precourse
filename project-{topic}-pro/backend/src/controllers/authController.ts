```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService, registerSchema, loginSchema } from '../services/authService';
import { validate } from '../utils/validation';
import { logger } from '../utils/logger';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            validate(registerSchema, req.body); // Validate request body

            const { user, token } = await this.authService.register(req.body);
            logger.info(`User registered: ${user.email}`);
            res.status(201).json({ success: true, message: 'User registered successfully.', user, token });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            validate(loginSchema, req.body); // Validate request body

            const { user, token } = await this.authService.login(req.body);
            logger.info(`User logged in: ${user.email}`);
            res.status(200).json({ success: true, message: 'Logged in successfully.', user, token });
        } catch (error) {
            next(error);
        }
    }
}
```
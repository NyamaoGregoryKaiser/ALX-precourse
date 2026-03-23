```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { catchAsync } from '../../utils/catchAsync';
import { registerSchema, loginSchema } from './auth.validation';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    public register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return next(error);

        const { username, email, password, role } = value;
        const { user, token } = await this.authService.register(username, email, password, role);

        res.status(201).json({
            status: 'success',
            data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
            token,
        });
    });

    public login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return next(error);

        const { email, password } = value;
        const { user, token } = await this.authService.login(email, password);

        res.status(200).json({
            status: 'success',
            data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
            token,
        });
    });
}
```
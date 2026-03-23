```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { authService } from './auth.service';
import { AuthenticatedRequest } from '../types';
import { registerSchema, loginSchema } from '../utils/validators';
import { ZodError } from 'zod';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { username, email, password } = validatedData;
      const { user, token } = await authService.register(username, email, password);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;
      const { user, token } = await authService.login(email, password);

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Logged in successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      await authService.logout(req.user.id);
      res.status(StatusCodes.OK).json({ status: 'success', message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
```
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/validation.utils';
import { CustomError } from '../interfaces/error.interface';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body; // Body validated by middleware

    const { user, token } = await authService.register(email, password, role);

    res.status(201).json({
      status: 'success',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body; // Body validated by middleware

    const { user, token } = await authService.login(email, password);

    res.status(200).json({
      status: 'success',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is populated by authenticateToken middleware
    if (!req.user) {
      return next(new CustomError(401, 'User not authenticated.'));
    }

    const user = await authService.findUserById(req.user.id);
    if (!user) {
      return next(new CustomError(404, 'User not found.'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};
```
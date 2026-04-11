```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { AppError } from '../utils/errorHandler';
import { registerSchema, loginSchema } from '../validators/authValidator';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { user, token } = await authService.registerUser(value);

    res.status(201).json({
      status: 'success',
      token,
      data: { user },
    });
  } catch (err: any) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { user, token } = await authService.loginUser(value);

    res.status(200).json({
      status: 'success',
      token,
      data: { user },
    });
  } catch (err: any) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by the protect middleware
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }

    // You might want to fetch a fresh user object from DB here
    // const user = await userService.getUserById(req.user.id);
    // if (!user) throw new AppError('User not found', 404);

    res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (err: any) {
    next(err);
  }
};
```
```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { CustomError } from '../../utils/error';
import { User } from '../../entities/User';

/**
 * Handles user registration.
 * @route POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body;
    const user = await authService.registerUser(email, password, role);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user); // In a real app, store this.

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user login.
 * @route POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUser(email, password);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user); // In a real app, store this.

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: { id: user.id, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user logout.
 * (For a real application, this would involve invalidating the refresh token, e.g., in Redis or DB)
 * @route POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  // In a real application, you would:
  // 1. Invalidate the user's refresh token (e.g., delete from database or add to a blacklist in Redis)
  // 2. Client-side should clear their access and refresh tokens.
  try {
    if (!req.user) {
      throw new CustomError('No user to log out.', 400);
    }
    // Example of a token blacklist for immediate access token invalidation (optional)
    // await cacheService.set(`blacklist:${req.headers.authorization?.split(' ')[1]}`, 'true', config.jwt.accessExpirationMinutes * 60);

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the currently authenticated user's profile.
 * @route GET /api/v1/auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    // Remove sensitive information like password hash
    const user = { ...req.user };
    delete user.password;
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
```

#### `backend/src/modules/auth/auth.service.ts`
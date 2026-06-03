```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AppError, HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../config/constants';
import { createRefreshToken, createAccessToken } from '../../utils/jwt';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    const user = await authService.registerUser(email, password, name);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Set refresh token as an HTTP-only cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production', // Use secure in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax', // Or 'none' if cross-site, with secure: true
    });

    res.status(HttpCode.CREATED).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error: any) {
    logger.error(`Auth registration error: ${error.message}`);
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUser(email, password);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });

    res.status(HttpCode.OK).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error: any) {
    logger.error(`Auth login error: ${error.message}`);
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear the refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      expires: new Date(0), // Expire immediately
      sameSite: 'lax',
    });

    res.status(HttpCode.OK).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error(`Auth logout error: ${error.message}`);
    next(error);
  }
};

// Implement refresh token logic if needed for long-lived sessions on mobile
// export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
//     if (!refreshToken) {
//       return next(new AppError('No refresh token provided', HttpCode.UNAUTHORIZED));
//     }
//     const newAccessToken = await authService.refreshAccessToken(refreshToken);
//     res.status(HttpCode.OK).json({ status: 'success', data: { accessToken: newAccessToken } });
//   } catch (error: any) {
//     logger.error(`Refresh token error: ${error.message}`);
//     next(error);
//   }
// };
```
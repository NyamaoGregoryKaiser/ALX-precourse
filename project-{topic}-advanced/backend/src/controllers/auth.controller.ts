```typescript
import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../services/auth.service';
import { BadRequestError } from '../middleware/errorHandler.middleware';
import logger from '../utils/logger';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dtos/auth.dto';

// Helper for sending tokens in HTTP-only cookies
const sendTokenResponse = (res: Response, accessToken: string, refreshToken: string, user: any) => {
  // Set refresh token in an HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_REFRESH_EXPIRES_IN)
  });

  res.status(200).json({
    status: 'success',
    accessToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    },
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;
    const user = await registerUser(username, email, password);
    logger.info(`User registration successful: ${user.email}`);

    // Log in immediately after registration
    const { accessToken, refreshToken } = await loginUser(user.email, password);
    sendTokenResponse(res, accessToken, refreshToken, user);

  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emailOrUsername, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser(emailOrUsername, password);
    logger.info(`User login successful: ${user.email}`);
    sendTokenResponse(res, accessToken, refreshToken, user);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return next(new BadRequestError('No refresh token provided.'));
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(oldRefreshToken);
    logger.info(`Access token refreshed for user: ${req.user?.id}`);
    sendTokenResponse(res, accessToken, newRefreshToken, req.user); // req.user populated from old token payload

  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (req.user && refreshToken) {
      await logoutUser(req.user.id, refreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
    logger.info(`User logged out: ${req.user?.id}`);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // User object is attached to req by the protect middleware
    if (!req.user) {
      return next(new BadRequestError('User not found after authentication.'));
    }
    res.status(200).json({ status: 'success', user: req.user });
  } catch (error) {
    next(error);
  }
};
```
```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, username } = req.body;
    const user = await authService.registerUser(email, password, username);
    // Remove password hash before sending to client
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ status: 'success', data: userWithoutPassword });
  } catch (error: any) {
    logger.error(`Registration error: ${error.message}`, { error });
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.loginUser(email, password);
    // Remove password hash before sending to client
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ status: 'success', data: { accessToken, refreshToken, user: userWithoutPassword } });
  } catch (error: any) {
    logger.error(`Login error: ${error.message}`, { error });
    next(error);
  }
};

export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }
    const { accessToken, newRefreshToken } = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({ status: 'success', data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error: any) {
    logger.error(`Refresh token error: ${error.message}`, { error });
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  // In a real system, you might blacklist refresh tokens.
  // For JWT, the client simply discards the tokens.
  // If using HTTP-only cookies, you'd clear them here.
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // User object is attached to the request by the `protect` middleware
    const user = req.user as any;
    // Remove password hash before sending to client
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ status: 'success', data: userWithoutPassword });
  } catch (error: any) {
    logger.error(`Get user info error: ${error.message}`, { error });
    next(error);
  }
};
```
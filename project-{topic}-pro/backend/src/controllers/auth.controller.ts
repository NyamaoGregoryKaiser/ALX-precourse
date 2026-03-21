```typescript
import { Request, Response, NextFunction } from 'express';
import authService from '@services/auth.service';
import logger from '@config/logger';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, role } = req.body;
      const { user, accessToken, refreshToken } = await authService.register(username, email, password, role);

      // In a real application, refresh token would be set in an HTTP-only cookie
      // res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, maxAge: /* refresh token expiration in ms */ });

      res.status(201).json({
        message: 'User registered successfully',
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        accessToken,
        refreshToken, // For demonstration, sending refresh token directly
      });
    } catch (error) {
      logger.error(`Register controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);

      res.status(200).json({
        message: 'Logged in successfully',
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error(`Login controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // In a real application, refresh token would be read from an HTTP-only cookie
      // For simplicity, we assume it's sent in the body or header.
      const { refreshToken } = req.body; // or req.cookies.refreshToken;

      if (!refreshToken) {
        logger.warn('Refresh token missing from request.');
        return res.status(401).json({ message: 'Refresh token is required.' });
      }

      const { accessToken } = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        message: 'Access token refreshed successfully',
        accessToken,
      });
    } catch (error) {
      logger.error(`Refresh token controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    // In a real app, if refresh tokens are stored in a database, invalidate it here.
    // If using HTTP-only cookies, clear the cookie: res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully.' });
  }
}

export default new AuthController();
```
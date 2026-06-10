```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dtos';
import { validate } from '../../shared/validators/joi.validator';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.validation';
import { logger } from '../../shared/utils/logger';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = validate(req.body, registerSchema);
      if (error) {
        return res.status(400).json({ message: 'Validation failed', errors: error.details });
      }
      const userData: RegisterDto = value;
      const newUser = await this.authService.register(userData);
      logger.info(`New user registered: ${newUser.email}`);
      res.status(201).json({ message: 'User registered successfully', user: { id: newUser.id, email: newUser.email, username: newUser.username } });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = validate(req.body, loginSchema);
      if (error) {
        return res.status(400).json({ message: 'Validation failed', errors: error.details });
      }
      const credentials: LoginDto = value;
      const { accessToken, refreshToken, user } = await this.authService.login(credentials);
      logger.info(`User logged in: ${user.email}`);
      res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = validate(req.body, refreshTokenSchema);
      if (error) {
        return res.status(400).json({ message: 'Validation failed', errors: error.details });
      }
      const { refreshToken } = value;
      const { accessToken, newRefreshToken } = await this.authService.refreshAccessToken(refreshToken);
      logger.info('Access token refreshed.');
      res.status(200).json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Assuming `req.user` is set by `authenticateToken` middleware
      // Or if logout needs to revoke a specific refresh token provided in body/cookie
      const userId = req.user?.id;
      if (userId) {
        await this.authService.logout(userId);
        logger.info(`User logged out: ${req.user?.email}`);
      } else {
        logger.warn('Logout attempt without authenticated user context.');
      }
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}

// Instantiate and export the controller
const authService = new AuthService();
export const authController = new AuthController(authService);
```
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * @file Authentication controller.
 *
 * This controller handles user registration and login requests,
 * interacting with the `AuthService` to perform business logic
 * and return appropriate responses, including JWT tokens.
 */

// Define Zod schemas for request validation
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registers a new user.
   * @route POST /api/auth/register
   * @param {Request} req - The Express request object containing user registration data.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = registerSchema.parse(req.body);
      const user = await this.authService.register(userData);
      logger.info(`User registered successfully: ${user.username}`);
      res.status(201).json({
        status: 'success',
        message: 'User registered successfully. Please log in.',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error during user registration: ${error.message}`);
      next(error); // Pass to global error handler
    }
  }

  /**
   * Logs in an existing user and returns JWT tokens.
   * @route POST /api/auth/login
   * @param {Request} req - The Express request object containing user login credentials.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const credentials = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await this.authService.login(credentials.email, credentials.password);
      logger.info(`User logged in successfully: ${user.username}`);
      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error during user login: ${error.message}`);
      next(error); // Pass to global error handler
    }
  }
}
```
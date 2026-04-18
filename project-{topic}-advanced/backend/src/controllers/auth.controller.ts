```typescript
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import UserService from '../services/user.service';
import { generateAccessToken } from '../utils/jwt';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;
      const newUser = await AuthService.registerUser(username, email, password);
      // For security, don't return password hash
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });
    } catch (error) {
      next(error); // Pass error to the global error handler
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await AuthService.validateUser(email, password);

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      const token = generateAccessToken(user.id, user.role);
      logger.info(`User ${user.email} logged in successfully.`);

      // For security, don't return password hash
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({ message: 'Login successful', token, user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response): Promise<void> {
    // For JWTs, logout is typically handled client-side by deleting the token.
    // If refresh tokens were implemented, this is where they'd be invalidated (e.g., from Redis blacklist).
    logger.info(`User ${req.user?.userId || 'unknown'} logged out.`);
    res.status(200).json({ message: 'User logged out (client-side token removal expected).' });
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.user is populated by authenticateToken middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication failed: User ID not found in token', 401);
      }
      const user = await UserService.getUserById(userId);
      if (!user) {
        throw new AppError('Authenticated user not found in database', 404);
      }
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
```
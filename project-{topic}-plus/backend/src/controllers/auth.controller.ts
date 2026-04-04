```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password } = req.body;
      const user = await authService.registerUser(username, email, password);
      res.status(httpStatus.CREATED).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.loginUser(email, password);
      res.status(httpStatus.OK).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // A server-side logout might involve blacklisting tokens,
  // but for stateless JWTs, client-side token removal is often sufficient.
  // async logout(req: Request, res: Response, next: NextFunction) {
  //   // Example: Blacklist the token in Redis
  //   // await jwtService.blacklistToken(req.token);
  //   res.status(httpStatus.OK).json({ message: 'Logged out successfully' });
  // }
}

export const authController = new AuthController();
```
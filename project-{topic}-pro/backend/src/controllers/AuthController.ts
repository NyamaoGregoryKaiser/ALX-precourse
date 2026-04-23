import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from '../middlewares/errorHandler';
import { UserRole } from '../entities/User';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, role } = req.body; // Role can be optional, default to USER
      const userRole = role && Object.values(UserRole).includes(role) ? role : UserRole.USER;

      const { user, token } = await this.authService.register(email, password, userRole);
      res.status(201).json({
        status: 'success',
        token,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { user, token } = await this.authService.login(email, password);
      res.status(200).json({
        status: 'success',
        token,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('User not authenticated', 401));
      }
      const user = await this.authService.getProfile(req.user.id);
      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };
}
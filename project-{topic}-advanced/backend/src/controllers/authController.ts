import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { CustomError } from '../middleware/errorHandler';
import { UserRole } from '../db/entities/User';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        throw new CustomError('Username, email, and password are required', 400);
      }
      // Only allow admin to create other admins
      const userRole = req.user?.role === UserRole.ADMIN && role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
      
      const newUser = await authService.register(username, email, password, userRole);
      res.status(201).json({
        message: 'User registered successfully',
        user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { emailOrUsername, password } = req.body;
      if (!emailOrUsername || !password) {
        throw new CustomError('Email/username and password are required', 400);
      }
      const { user, token } = await authService.login(emailOrUsername, password);
      res.status(200).json({
        message: 'Logged in successfully',
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
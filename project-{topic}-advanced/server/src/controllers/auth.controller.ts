import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { logger } from '../middleware/logger.middleware';
import { AppError } from '../utils/appError';

const authService = new AuthService();
const userService = new UserService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required', 400);
    }
    const user = await authService.register(username, email, password);
    logger.info(`User registered: ${user.email}`);
    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    const { token, user } = await authService.login(email, password);
    logger.info(`User logged in: ${user.email}`);
    res.header('x-auth-token', token).status(200).json({ message: 'Logged in successfully', user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is populated by authenticateToken middleware
    const userId = (req as any).user.id;
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.status(200).json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
};
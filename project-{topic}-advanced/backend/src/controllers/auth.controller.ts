import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync.util';
import { logger } from '../utils/logger.util';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    logger.debug('Attempting user registration', { email: req.body.email });
    const { user, token } = await this.authService.register(req.body);
    logger.info('User registered successfully', { userId: user.id });
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  });

  login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    logger.debug('Attempting user login', { email: req.body.email });
    const { user, token } = await this.authService.login(req.body.email, req.body.password);
    logger.info('User logged in successfully', { userId: user.id });
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  });

  getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    logger.debug('Fetching profile for user', { userId: req.user.id });
    const userProfile = await this.authService.getProfile(req.user.id);
    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    res.status(200).json({
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt,
    });
  });
}
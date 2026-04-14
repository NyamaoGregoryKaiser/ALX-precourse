import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { CustomError } from '../../middlewares/error.middleware';
import logger from '../../utils/logger';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      throw new CustomError('Please provide email, password, first name, and last name.', 400);
    }
    const user = await authService.registerUser(email, password, firstName, lastName);
    res.status(201).json({ message: 'User registered successfully', userId: user.id, email: user.email });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new CustomError('Please provide email and password.', 400);
    }
    const { user, token } = await authService.loginUser(email, password);
    res.status(200).json({ message: 'Logged in successfully', user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName }, token });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new CustomError('User not authenticated.', 401);
    }
    const user = await authService.getUserProfile(req.user.userId);
    if (!user) {
      throw new CustomError('User not found.', 404);
    }
    res.status(200).json({ user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    next(error);
  }
};
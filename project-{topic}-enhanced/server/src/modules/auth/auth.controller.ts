import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as authService from './auth.service';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';
import { config } from '@/config';
import logger from '@/utils/logger';

// Register a new user
export const register = catchAsync(async (req: Request, res: Response) => {
  const { username, email, password, firstName, lastName, roleIds } = req.body;
  const user = await authService.registerUser({ username, email, password, firstName, lastName, roleIds });
  const tokens = await authService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

// Login user
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.loginUserWithEmailAndPassword(email, password);
  res.status(httpStatus.OK).send({ user, tokens });
});

// Refresh tokens
export const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const { user, tokens } = await authService.refreshAuthTokens(refreshToken);
  res.status(httpStatus.OK).send({ user, tokens });
});

// Logout user
export const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

// Forgot Password
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  // In a real app, send an email with the reset token
  const resetToken = await authService.generatePasswordResetToken(email);
  logger.info(`Password reset token for ${email}: ${resetToken}`); // For dev purposes only!
  res.status(httpStatus.OK).send({ message: 'If a matching account was found, a password reset link has been sent to your email. (Check server logs for token in dev mode).' });
});

// Reset Password
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  res.status(httpStatus.NO_CONTENT).send();
});
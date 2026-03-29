import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as userService from './user.service';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';
import logger from '@/utils/logger';

// Create a new user (typically by an admin)
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

// Get all users
export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getUsers();
  res.status(httpStatus.OK).send(users);
});

// Get a single user by ID
export const getUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.status(httpStatus.OK).send(user);
});

// Update a user by ID
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.status(httpStatus.OK).send(user);
});

// Delete a user by ID
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Get current user profile (authenticated user)
export const getCurrentUserProfile = catchAsync(async (req: Request, res: Response) => {
  // req.user is set by the authentication middleware
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }
  const user = await userService.getUserById(req.user.id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User profile not found');
  }
  res.status(httpStatus.OK).send(user);
});

// Update current user profile
export const updateCurrentUserProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }
  // Prevent changing roles or sensitive fields via this endpoint
  const allowedUpdates = pick(req.body, ['username', 'email', 'firstName', 'lastName']);
  const user = await userService.updateUserById(req.user.id, allowedUpdates);
  res.status(httpStatus.OK).send(user);
});
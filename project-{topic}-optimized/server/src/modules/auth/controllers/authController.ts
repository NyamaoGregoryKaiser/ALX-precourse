import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import asyncHandler from '../../../utils/asyncHandler';
import { RegisterDto, LoginDto } from '../../../types';
import { CreatedResponse, SuccessResponse } from '../../../utils/apiResponse';

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password }: RegisterDto = req.body;
  const newUser = await authService.registerUser(username, email, password);
  new CreatedResponse(res, 'User registered successfully', {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
  }).send();
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { username, password }: LoginDto = req.body;
  const { user, token } = await authService.loginUser(username, password);
  new SuccessResponse(res, 'Login successful', {
    id: user.id,
    username: user.username,
    email: user.email,
    token: token,
  }).send();
});
```
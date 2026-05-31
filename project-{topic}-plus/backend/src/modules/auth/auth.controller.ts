import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as authService from './auth.service';

/**
 * Handles user registration.
 */
export const registerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const { token, user } = await authService.registerUser({ email, password, firstName, lastName });

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      token,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user login.
 */
export const loginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.loginUser(email, password);

    res.status(StatusCodes.OK).json({
      status: 'success',
      token,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
```
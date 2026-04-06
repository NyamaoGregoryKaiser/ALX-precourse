```typescript
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { registerSchema, loginSchema } from './auth.validation';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { email, password, firstName, lastName } = value;
  const result = await authService.register({ email, password, firstName, lastName });
  logger.info(`User registered: ${email}`);
  res.status(201).json({
    message: 'Registration successful. Account created.',
    token: result.token,
    user: result.user,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { email, password } = value;
  const result = await authService.login(email, password);
  logger.info(`User logged in: ${email}`);
  res.status(200).json({
    message: 'Login successful',
    token: result.token,
    user: result.user,
  });
});
```
```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import authService from '../../services/authService';
import { RegisterUserDto, LoginUserDto, RefreshTokenDto } from '../validators/auth.validation';
import ApiError from '../../utils/ApiError';

const register = catchAsync(async (req: Request<any, any, RegisterUserDto>, res: Response) => {
  const { user, tokens } = await authService.registerUser(req.body);
  res.status(StatusCodes.CREATED).send({ user: { id: user.id, username: user.username, email: user.email }, tokens });
});

const login = catchAsync(async (req: Request<any, any, LoginUserDto>, res: Response) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.loginUserWithEmailAndPassword(email, password);
  res.status(StatusCodes.OK).send({ user: { id: user.id, username: user.username, email: user.email }, tokens });
});

const logout = catchAsync(async (req: Request<any, any, RefreshTokenDto>, res: Response) => {
  // In a real application, you might also want to blacklist the refresh token if stored.
  // For JWT access token, we can blacklist it if it's still active.
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (accessToken) {
    await authService.logout(accessToken);
  }
  res.status(StatusCodes.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req: Request<any, any, RefreshTokenDto>, res: Response) => {
  const tokens = await authService.refreshAuth(req.body.token);
  res.status(StatusCodes.OK).send({ tokens });
});

export default {
  register,
  login,
  logout,
  refreshTokens,
};
```
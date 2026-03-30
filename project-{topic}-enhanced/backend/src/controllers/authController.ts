import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import httpStatus from 'http-status';
import { catchAsync } from '../utils/catchAsync';
import { UserRole } from '../entities/User';
import { generateToken } from '../utils/jwt';

const register = catchAsync(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role } = req.body;
  const user = await userService.createUser({ email, password, firstName, lastName, role: role || UserRole.USER });
  const token = generateToken(user.id, user.email, user.role);
  res.status(httpStatus.CREATED).send({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, token });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, token } = await userService.loginUser(email, password);
  res.send({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, token });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.user!.id);
  if (!user) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'User not found' });
  }
  res.send({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } });
});

export const authController = {
  register,
  login,
  getMe,
};
```

#### `backend/src/controllers/userController.ts`
```typescript
import { UserRepository } from '../repositories/UserRepository';
import { User, UserRole } from '../entities/User';
import { ApiError } from '../utils/ApiError';
import httpStatus from 'http-status';
import { generateToken } from '../utils/jwt';
import { clearCache } from '../middleware/cache';

const createUser = async (userData: Partial<User>): Promise<User> => {
  if (await UserRepository.findByEmail(userData.email!)) {
    throw new ApiError(httpStatus.CONFLICT, 'Email already taken');
  }
  const user = UserRepository.create(userData);
  await UserRepository.save(user);
  await clearCache('users'); // Invalidate user list cache
  return user;
};

const loginUser = async (email: string, passwordPlain: string): Promise<{ user: User; token: string }> => {
  const user = await UserRepository.findByEmail(email);
  if (!user || !(await user.comparePassword(passwordPlain))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  const token = generateToken(user.id, user.email, user.role);
  return { user, token };
};

const getUserById = async (id: string): Promise<User | null> => {
  return UserRepository.findById(id);
};

const getAllUsers = async (): Promise<User[]> => {
  return UserRepository.find({ order: { email: 'ASC' } });
};

const updateUserRole = async (userId: string, role: UserRole): Promise<User> => {
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.role = role;
  await UserRepository.save(user);
  await clearCache('users'); // Invalidate user list cache
  return user;
};

export const userService = {
  createUser,
  loginUser,
  getUserById,
  getAllUsers,
  updateUserRole,
};
```

#### `backend/src/services/projectService.ts`
```typescript
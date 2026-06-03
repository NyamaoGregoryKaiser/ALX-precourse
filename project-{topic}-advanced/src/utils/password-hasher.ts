```typescript
import bcrypt from 'bcryptjs';
import { AppError, HttpCode } from './app-error';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new AppError('Error hashing password', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new AppError('Error comparing passwords', HttpCode.INTERNAL_SERVER_ERROR);
  }
};
```
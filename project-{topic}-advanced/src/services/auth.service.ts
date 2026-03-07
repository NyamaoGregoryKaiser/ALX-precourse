```typescript
import { AppDataSourceInstance } from '../database';
import { User, UserRole } from '../database/entities/User';
import { hashPassword, comparePasswords, generateToken } from '../utils/auth.utils';
import { CustomError } from '../interfaces/error.interface';
import logger from '../config/logger';

export class AuthService {
  private userRepository = AppDataSourceInstance.getRepository(User);

  async register(email: string, password: string, role: UserRole = UserRole.USER): Promise<{ user: User; token: string }> {
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new CustomError(409, 'User with this email already exists.');
    }

    const hashedPassword = await hashPassword(password);
    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      role,
    });
    await this.userRepository.save(newUser);

    const token = generateToken(newUser);
    logger.info(`New user registered: ${newUser.email} with role ${newUser.role}`);
    return { user: newUser, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new CustomError(401, 'Invalid credentials.');
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError(401, 'Invalid credentials.');
    }

    const token = generateToken(user);
    logger.info(`User logged in: ${user.email}`);
    return { user, token };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }
}
```
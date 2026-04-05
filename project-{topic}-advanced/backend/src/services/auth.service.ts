```typescript
import { AppDataSource } from '../database/data-source';
import { User, UserRole } from '../entities/User.entity';
import { UserRepository } from '../repositories/User.repository';
import { hashPassword, comparePasswords } from '../utils/password.utils';
import { generateJwtToken } from '../auth/jwt.utils';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';

class AuthService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async registerUser(username: string, email: string, passwordPlain: string): Promise<User> {
    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new ApiError(StatusCodes.CONFLICT, 'User with this email already exists.');
    }

    const existingUserByUsername = await this.userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw new ApiError(StatusCodes.CONFLICT, 'User with this username already exists.');
    }

    const hashedPassword = await hashPassword(passwordPlain);

    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: UserRole.USER, // Default role
    });

    await this.userRepository.save(newUser);
    return newUser;
  }

  async loginUser(email: string, passwordPlain: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.password') // Select password explicitly
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials.');
    }

    const isPasswordValid = await comparePasswords(passwordPlain, user.password);
    if (!isPasswordValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials.');
    }

    const token = generateJwtToken(user.id, user.role);

    // Remove password from user object before returning
    delete user.password;

    return { user, token };
  }
}

// Instantiate the service with its repository
export const authService = new AuthService(new UserRepository(AppDataSource.getRepository(User)));
```
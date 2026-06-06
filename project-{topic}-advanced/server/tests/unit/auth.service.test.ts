import { AuthService } from '../../src/services/auth.service';
import { AppDataSource } from '../../src/database/data-source';
import { User } from '../../src/database/entities/User.entity';
import { AppError } from '../../src/utils/appError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.types';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository = AppDataSource.getRepository(User);

  beforeAll(async () => {
    authService = new AuthService();
  });

  beforeEach(async () => {
    await userRepository.clear(); // Clear users before each test
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const user = await authService.register('testuser', 'test@example.com', 'password123');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe(UserRole.VIEWER);

      const foundUser = await userRepository.findOneBy({ email: 'test@example.com' });
      expect(foundUser).toBeDefined();
      expect(await bcrypt.compare('password123', foundUser!.password)).toBe(true);
    });

    it('should throw AppError if user with email already exists', async () => {
      await authService.register('existinguser', 'exists@example.com', 'password123');
      await expect(authService.register('anotheruser', 'exists@example.com', 'password456')).rejects.toThrow(AppError);
      await expect(authService.register('anotheruser', 'exists@example.com', 'password456')).rejects.toHaveProperty('statusCode', 409);
    });
  });

  describe('login', () => {
    let hashedPassword = '';
    let testUser: User;

    beforeEach(async () => {
      hashedPassword = await bcrypt.hash('password123', 10);
      testUser = userRepository.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: hashedPassword,
        role: UserRole.EDITOR,
      });
      await userRepository.save(testUser);
    });

    it('should log in a user and return a token', async () => {
      const { token, user } = await authService.login('login@example.com', 'password123');
      expect(token).toBeDefined();
      expect(user.email).toBe('login@example.com');

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      expect(decoded.id).toBe(user.id);
      expect(decoded.role).toBe(user.role);
    });

    it('should throw AppError for invalid email', async () => {
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(AppError);
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toHaveProperty('statusCode', 401);
    });

    it('should throw AppError for invalid password', async () => {
      await expect(authService.login('login@example.com', 'wrongpassword')).rejects.toThrow(AppError);
      await expect(authService.login('login@example.com', 'wrongpassword')).rejects.toHaveProperty('statusCode', 401);
    });
  });
});
```typescript
import { AppDataSource } from '../../src/config/database';
import { User, UserRole } from '../../src/entities/User';
import { CustomError } from '../../src/utils/error';
import * as authService from '../../src/modules/auth/auth.service';
import { Repository } from 'typeorm';

// Mock the AppDataSource and its getRepository method
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOneBy: jest.fn(),
      save: jest.fn(),
    })),
  },
}));

describe('Auth Service', () => {
  let userRepository: Repository<User>;

  beforeAll(() => {
    userRepository = AppDataSource.getRepository(User);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      const newUser = new User();
      newUser.id = 'uuid-123';
      newUser.email = 'test@example.com';
      newUser.password = 'hashedpassword';
      newUser.role = UserRole.USER;
      newUser.hashPassword = jest.fn().mockResolvedValue('hashedpassword'); // Mock the hashPassword method

      (userRepository.findOneBy as jest.Mock).mockResolvedValue(null); // No existing user
      (userRepository.save as jest.Mock).mockResolvedValue(newUser);

      const result = await authService.registerUser('test@example.com', 'Password123!', UserRole.USER);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(newUser.hashPassword).toHaveBeenCalledWith('Password123!');
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
      }));
      expect(result).toEqual(newUser);
    });

    it('should throw CustomError if user with email already exists', async () => {
      const existingUser = new User();
      existingUser.email = 'existing@example.com';

      (userRepository.findOneBy as jest.Mock).mockResolvedValue(existingUser); // User already exists

      await expect(authService.registerUser('existing@example.com', 'Password123!')).rejects.toThrow(CustomError);
      await expect(authService.registerUser('existing@example.com', 'Password123!')).rejects.toHaveProperty('statusCode', 409);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should successfully log in an existing user', async () => {
      const user = new User();
      user.id = 'uuid-123';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.comparePassword = jest.fn().mockResolvedValue(true); // Password matches

      (userRepository.findOneBy as jest.Mock).mockResolvedValue(user);

      const result = await authService.loginUser('test@example.com', 'Password123!');

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(user.comparePassword).toHaveBeenCalledWith('Password123!');
      expect(result).toEqual(user);
    });

    it('should throw CustomError if user not found', async () => {
      (userRepository.findOneBy as jest.Mock).mockResolvedValue(null); // User not found

      await expect(authService.loginUser('nonexistent@example.com', 'Password123!')).rejects.toThrow(CustomError);
      await expect(authService.loginUser('nonexistent@example.com', 'Password123!')).rejects.toHaveProperty('statusCode', 401);
    });

    it('should throw CustomError if password is incorrect', async () => {
      const user = new User();
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.comparePassword = jest.fn().mockResolvedValue(false); // Password mismatch

      (userRepository.findOneBy as jest.Mock).mockResolvedValue(user);

      await expect(authService.loginUser('test@example.com', 'WrongPassword')).rejects.toThrow(CustomError);
      await expect(authService.loginUser('test@example.com', 'WrongPassword')).rejects.toHaveProperty('statusCode', 401);
    });
  });
});
```

#### `backend/tests/integration/auth.integration.test.ts`
```typescript
import { AuthService } from '../../src/services/AuthService';
import { User } from '../../src/entities/User';
import { Repository } from 'typeorm';
import { AppError } from '../../src/utils/AppError';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { environment } from '../../src/config/environment';

// Mock TypeORM Repository
const mockUserRepository: Partial<Repository<User>> = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// Mock bcrypt and jsonwebtoken
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hashedPassword) => Promise.resolve(password === hashedPassword.replace('hashed_', ''))),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret, options) => {
    if (secret === 'invalid_secret') throw new Error('Invalid secret');
    return `mocked_token_${payload.userId}_${payload.role}_${options.expiresIn}`;
  }),
  verify: jest.fn(), // Not used in AuthService but good to mock
}));

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockUserRepository as Repository<User>);
    jest.clearAllMocks();
    // Reset environment variables for consistent test results
    environment.jwtSecret = 'supersecretjwtkey';
    environment.jwtAccessTokenExpiration = '1h';
    environment.jwtRefreshTokenExpiration = '7d';
  });

  // --- Register Tests ---
  describe('register', () => {
    it('should successfully register a new user', async () => {
      const newUser = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const createdUser = { ...newUser, id: 'some-uuid', password: 'hashed_password123', role: 'user' };

      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      (mockUserRepository.create as jest.Mock).mockReturnValue(createdUser);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(createdUser);

      const result = await authService.register(newUser);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: newUser.username }, { email: newUser.email }],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newUser.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        username: newUser.username,
        email: newUser.email,
        password: 'hashed_password123',
        role: 'user',
      }));
      expect(mockUserRepository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });

    it('should throw AppError if username already exists', async () => {
      const newUser = { username: 'existing', email: 'new@example.com', password: 'password123' };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id', username: 'existing' });

      await expect(authService.register(newUser)).rejects.toThrow(AppError);
      await expect(authService.register(newUser)).rejects.toHaveProperty('statusCode', 409);
      await expect(authService.register(newUser)).rejects.toHaveProperty('message', 'Username already taken');
    });

    it('should throw AppError if email already exists', async () => {
      const newUser = { username: 'new', email: 'existing@example.com', password: 'password123' };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id', email: 'existing@example.com' });

      await expect(authService.register(newUser)).rejects.toThrow(AppError);
      await expect(authService.register(newUser)).rejects.toHaveProperty('statusCode', 409);
      await expect(authService.register(newUser)).rejects.toHaveProperty('message', 'Email already registered');
    });
  });

  // --- Login Tests ---
  describe('login', () => {
    it('should successfully log in a user and return tokens', async () => {
      const user = { id: 'user-uuid', username: 'testuser', email: 'test@example.com', password: 'hashed_password123', role: 'user' as const };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await authService.login('test@example.com', 'password123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: user.email },
        select: ['id', 'username', 'email', 'password', 'role'],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', user.password);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: user.id, role: user.role },
        environment.jwtSecret,
        { expiresIn: environment.jwtAccessTokenExpiration }
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: user.id, role: user.role },
        environment.jwtSecret,
        { expiresIn: environment.jwtRefreshTokenExpiration }
      );
      expect(result.user).toEqual({ id: user.id, username: user.username, email: user.email, role: user.role }); // Password removed
      expect(result.accessToken).toBe(`mocked_token_${user.id}_${user.role}_${environment.jwtAccessTokenExpiration}`);
      expect(result.refreshToken).toBe(`mocked_token_${user.id}_${user.role}_${environment.jwtRefreshTokenExpiration}`);
    });

    it('should throw AppError if user not found', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(AppError);
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toHaveProperty('statusCode', 401);
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toHaveProperty('message', 'Invalid credentials');
    });

    it('should throw AppError if password is incorrect', async () => {
      const user = { id: 'user-uuid', username: 'testuser', email: 'test@example.com', password: 'hashed_password123', role: 'user' as const };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Incorrect password

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(AppError);
      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toHaveProperty('statusCode', 401);
      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toHaveProperty('message', 'Invalid credentials');
    });

    it('should handle JWT signing errors', async () => {
      const user = { id: 'user-uuid', username: 'testuser', email: 'test@example.com', password: 'hashed_password123', role: 'user' as const };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(user);
      (jwt.sign as jest.Mock).mockImplementationOnce(() => { throw new Error('JWT sign error'); }); // Simulate error on access token

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow('JWT sign error');
    });
  });
});
```
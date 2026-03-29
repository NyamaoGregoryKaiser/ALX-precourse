```typescript
import { AuthService } from '../../services/AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from '../../entities/User';
import { config } from '../../config';

// Mock UserRepository
jest.mock('../../repositories/UserRepository', () => ({
  UserRepository: {
    findByEmail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  },
}));

// Mock bcrypt and jsonwebtoken
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUser: User;

  beforeEach(() => {
    authService = new AuthService();
    mockUser = new User();
    mockUser.id = 'some-uuid';
    mockUser.email = 'test@example.com';
    mockUser.password = 'hashedPassword';
    mockUser.role = 'user';
    mockUser.createdAt = new Date();
    mockUser.updatedAt = new Date();

    // Reset mocks before each test
    jest.clearAllMocks();
    (UserRepository.create as jest.Mock).mockReturnValue(mockUser);
    (UserRepository.save as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    (jwt.sign as jest.Mock).mockReturnValue('mockToken');
  });

  // --- Register Tests ---
  describe('register', () => {
    it('should register a new user successfully', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null); // No existing user

      const newUser = await authService.register('newuser@example.com', 'password123');

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(UserRepository.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'hashedPassword',
        role: 'user',
      });
      expect(UserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(newUser).toEqual(mockUser);
    });

    it('should return null if user with email already exists', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser); // User already exists

      const newUser = await authService.register('test@example.com', 'password123');

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(newUser).toBeNull();
      expect(UserRepository.create).not.toHaveBeenCalled();
      expect(UserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw an error if password hashing fails', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing error'));

      await expect(authService.register('error@example.com', 'password123')).rejects.toThrow('Hashing error');
      expect(UserRepository.save).not.toHaveBeenCalled();
    });
  });

  // --- Login Tests ---
  describe('login', () => {
    it('should login a user successfully and return a token and role', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Password matches

      const result = await authService.login('test@example.com', 'password123');

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, role: mockUser.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      expect(result).toEqual({ token: 'mockToken', role: 'user' });
    });

    it('should return null if user is not found', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await authService.login('nonexistent@example.com', 'password123');

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password does not match

      const result = await authService.login('test@example.com', 'wrongpassword');

      expect(UserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
      expect(result).toBeNull();
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
```
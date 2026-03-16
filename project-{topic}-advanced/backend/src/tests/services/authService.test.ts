import { AppDataSource } from '../../db/data-source';
import { User, UserRole } from '../../db/entities/User';
import { authService } from '../../services/authService';
import { CustomError } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let userRepository: any;

  beforeAll(async () => {
    userRepository = AppDataSource.getRepository(User);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      (userRepository.create as jest.Mock).mockReturnValue({
        id: '1',
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.USER,
      });
      (userRepository.save as jest.Mock).mockResolvedValue({
        id: '1',
        username: 'newuser',
        email: 'newuser@example.com',
        role: UserRole.USER,
      });

      const user = await authService.register('newuser', 'newuser@example.com', 'password123');
      expect(user).toBeDefined();
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('newuser@example.com');
      expect(user.role).toBe(UserRole.USER);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw CustomError if user already exists', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: '1' });

      await expect(authService.register('existing', 'existing@example.com', 'password'))
        .rejects.toThrow(CustomError);
      await expect(authService.register('existing', 'existing@example.com', 'password'))
        .rejects.toHaveProperty('statusCode', 409);
    });
  });

  describe('login', () => {
    it('should log in a user and return a token', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
      };
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock_jwt_token');

      const { user, token } = await authService.login('test@example.com', 'password123');
      expect(user).toBeDefined();
      expect(token).toBe('mock_jwt_token');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should throw CustomError for invalid credentials (user not found)', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password'))
        .rejects.toThrow(CustomError);
      await expect(authService.login('nonexistent@example.com', 'password'))
        .rejects.toHaveProperty('statusCode', 401);
    });

    it('should throw CustomError for invalid credentials (incorrect password)', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
      };
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow(CustomError);
      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toHaveProperty('statusCode', 401);
    });
  });
});
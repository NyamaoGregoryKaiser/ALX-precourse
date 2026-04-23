import { AuthService } from '../../src/services/AuthService';
import { UserRepository } from '../../src/repositories/UserRepository';
import { User, UserRole } from '../../src/entities/User';
import * as jwtUtils from '../../src/utils/jwt';
import bcrypt from 'bcryptjs';
import { AppError } from '../../src/middlewares/errorHandler';

// Mock dependencies
jest.mock('../../src/repositories/UserRepository');
jest.mock('bcryptjs');
jest.mock('../../src/utils/jwt');

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let mockUser: User;

  beforeEach(() => {
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService();

    mockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: UserRole.USER,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      accounts: [],
      merchants: []
    };

    (userRepository.findByEmail as jest.Mock).mockClear();
    (userRepository.create as jest.Mock).mockClear();
    (bcrypt.hash as jest.Mock).mockClear();
    (bcrypt.compare as jest.Mock).mockClear();
    (jwtUtils.generateToken as jest.Mock).mockClear();
    (AppError as jest.Mock).mockClear();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpassword');
      (userRepository.create as jest.Mock).mockResolvedValue({ ...mockUser, passwordHash: 'newhashedpassword' });
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('new_jwt_token');

      const { user, token } = await authService.register('new@example.com', 'strongpassword');

      expect(userRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('strongpassword', expect.any(Number));
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        passwordHash: 'newhashedpassword',
        role: UserRole.USER,
      });
      expect(jwtUtils.generateToken).toHaveBeenCalledWith(expect.any(User));
      expect(user.email).toBe('new@example.com');
      expect(token).toBe('new_jwt_token');
    });

    it('should throw an error if user already exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register('test@example.com', 'password')).rejects.toBeInstanceOf(AppError);
      expect(AppError).toHaveBeenCalledWith('User with that email already exists', 409);
    });

    it('should throw an error if email or password are missing', async () => {
        await expect(authService.register('', 'password')).rejects.toBeInstanceOf(AppError);
        expect(AppError).toHaveBeenCalledWith('Email and password are required', 400);

        await expect(authService.register('email@test.com', '')).rejects.toBeInstanceOf(AppError);
        expect(AppError).toHaveBeenCalledWith('Email and password are required', 400);
    });
  });

  describe('login', () => {
    it('should successfully log in a user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('login_jwt_token');

      const { user, token } = await authService.login('test@example.com', 'password123');

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
      expect(jwtUtils.generateToken).toHaveBeenCalledWith(mockUser);
      expect(user.email).toBe('test@example.com');
      expect(token).toBe('login_jwt_token');
    });

    it('should throw an error for invalid credentials (user not found)', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password')).rejects.toBeInstanceOf(AppError);
      expect(AppError).toHaveBeenCalledWith('Invalid credentials', 401);
    });

    it('should throw an error for invalid credentials (wrong password)', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toBeInstanceOf(AppError);
      expect(AppError).toHaveBeenCalledWith('Invalid credentials', 401);
    });

    it('should throw an error if email or password are missing', async () => {
        await expect(authService.login('', 'password')).rejects.toBeInstanceOf(AppError);
        expect(AppError).toHaveBeenCalledWith('Email and password are required', 400);
    });
  });

  describe('getProfile', () => {
    it('should retrieve a user profile', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const profile = await authService.getProfile(mockUser.id);

      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(profile.id).toBe(mockUser.id);
      expect(profile.passwordHash).toBeUndefined(); // Ensure sensitive data is omitted
    });

    it('should throw an error if user not found for profile', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent-id')).rejects.toBeInstanceOf(AppError);
      expect(AppError).toHaveBeenCalledWith('User not found', 404);
    });
  });
});
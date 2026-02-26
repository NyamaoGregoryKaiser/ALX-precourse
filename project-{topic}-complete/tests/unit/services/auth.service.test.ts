import { register, login } from '../../../src/api/v1/services/auth.service';
import { AppDataSource } from '../../../src/database/data-source';
import { User, UserRole } from '../../../src/database/entities/User.entity';
import { AppError } from '../../../src/utils/AppError';
import * as jwtUtils from '../../../src/utils/jwt';
import * as bcrypt from 'bcryptjs';

// Mock TypeORM Repository
const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
};

// Mock AppDataSource to return our mock repository
jest.mock('../../../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockUserRepository),
    isInitialized: true,
  },
}));

// Mock jwt utility functions
jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn(),
}));

// Mock bcrypt (specifically for compare)
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(() => 'hashedPassword123'), // Mock hash for register
}));


describe('Auth Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (mockUserRepository.create as jest.Mock).mockImplementation((data) => ({ ...data, id: 'new-user-id', hashPassword: jest.fn(() => Promise.resolve()) }));
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      };

      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(null); // User does not exist
      (mockUserRepository.save as jest.Mock).mockResolvedValue({ ...userData, id: 'some-uuid', role: UserRole.USER });
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('mocked-jwt-token');

      const result = await register(userData);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(jwtUtils.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'some-uuid',
          email: userData.email,
          role: UserRole.USER,
        })
      );
      expect(result).toEqual({
        user: expect.objectContaining({ email: userData.email }),
        token: 'mocked-jwt-token',
      });
    });

    it('should throw AppError if user with email already exists', async () => {
      const userData = {
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'password123',
      };

      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue({ email: userData.email }); // User exists

      await expect(register(userData)).rejects.toThrow(
        new AppError('User with this email already exists.', 409)
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(jwtUtils.generateToken).not.toHaveBeenCalled();
    });

    it('should handle hashing password correctly', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'Hash',
        email: 'hash@example.com',
        password: 'password123',
      };

      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      const newUserInstance = new User(); // Create a real instance to test hashPassword method call
      newUserInstance.email = userData.email;
      newUserInstance.password = userData.password;
      newUserInstance.firstName = userData.firstName;
      newUserInstance.lastName = userData.lastName;
      newUserInstance.role = UserRole.USER;
      newUserInstance.id = 'some-uuid';

      jest.spyOn(newUserInstance, 'hashPassword').mockResolvedValue(undefined); // Mock internal hash method
      (mockUserRepository.create as jest.Mock).mockReturnValue(newUserInstance);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(newUserInstance);
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('mocked-jwt-token');


      await register(userData);

      expect(newUserInstance.hashPassword).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUserInstance);
    });
  });

  describe('login', () => {
    it('should successfully log in an existing user', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };
      const hashedPassword = 'hashedPassword'; // This is what `bcrypt.hash` would return
      const mockUser = {
        id: 'user-id-1',
        email: loginData.email,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        comparePassword: jest.fn(() => Promise.resolve(true)), // Mock successful password comparison
      };

      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('mocked-jwt-token');

      const result = await login(loginData);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: loginData.email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(jwtUtils.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        })
      );
      expect(result).toEqual({
        user: expect.objectContaining({ email: loginData.email }),
        token: 'mocked-jwt-token',
      });
    });

    it('should throw AppError if user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(null);

      await expect(login(loginData)).rejects.toThrow(
        new AppError('Invalid credentials.', 401)
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: loginData.email });
      expect(jwtUtils.generateToken).not.toHaveBeenCalled();
    });

    it('should throw AppError for incorrect password', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };
      const hashedPassword = 'hashedPassword';
      const mockUser = {
        id: 'user-id-1',
        email: loginData.email,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        comparePassword: jest.fn(() => Promise.resolve(false)), // Mock failed password comparison
      };

      (mockUserRepository.findOneBy as jest.Mock).mockResolvedValue(mockUser);

      await expect(login(loginData)).rejects.toThrow(
        new AppError('Invalid credentials.', 401)
      );
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: loginData.email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(jwtUtils.generateToken).not.toHaveBeenCalled();
    });
  });
});
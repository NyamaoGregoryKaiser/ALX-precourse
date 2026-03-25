import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { LoggerService } from '../utils/logger';

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`)),
}));

/**
 * Unit tests for `AuthService`.
 * Focuses on testing the business logic of authentication service in isolation,
 * mocking its dependencies (UsersService, JwtService, LoggerService).
 */
describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let loggerService: LoggerService;

  // Mock implementation for UsersService
  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findOne: jest.fn(),
  };

  // Mock implementation for JwtService
  const mockJwtService = {
    sign: jest.fn(() => 'mockAccessToken'),
  };

  // Mock implementation for LoggerService
  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  // Setup before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
    };
    const newUser = {
      id: 'uuid-1',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashed_Password123!',
      roles: [UserRole.USER],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await service.register(registerUserDto);
      expect(result).toEqual(expect.objectContaining({ id: 'uuid-1', username: 'testuser' }));
      expect(result).not.toHaveProperty('password'); // Password should not be returned
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerUserDto.email);
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(registerUserDto.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerUserDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerUserDto,
        password: 'hashed_Password123!',
      });
      expect(loggerService.log).toHaveBeenCalledWith(
        `Attempting to register new user: ${registerUserDto.email}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `User registered successfully: ${newUser.email}`,
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(newUser);

      await expect(service.register(registerUserDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerUserDto.email);
      expect(mockUsersService.findByUsername).not.toHaveBeenCalled(); // Should short-circuit
    });

    it('should throw BadRequestException if username already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(newUser);

      await expect(service.register(registerUserDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerUserDto.email);
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(registerUserDto.username);
    });
  });

  describe('validateUser', () => {
    const user = {
      id: 'uuid-1',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashed_password',
      roles: [UserRole.USER],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user object if credentials are valid', async () => {
      mockUsersService.findByUsername.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password');
      expect(result).toEqual(expect.objectContaining({ id: 'uuid-1', username: 'testuser' }));
      expect(result).not.toHaveProperty('password');
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('testuser', true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed_password');
    });

    it('should return null if user not found', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');
      expect(result).toBeNull();
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('nonexistent', true);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      mockUsersService.findByUsername.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');
      expect(result).toBeNull();
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('testuser', true);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed_password');
    });
  });

  describe('login', () => {
    const loginUserDto = {
      username: 'testuser',
      password: 'password',
    };
    const userPayload = {
      id: 'uuid-1',
      username: 'testuser',
      email: 'test@example.com',
      roles: [UserRole.USER],
    };

    it('should return an access token on successful login', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(userPayload);
      const result = await service.login(loginUserDto);

      expect(result).toEqual({ access_token: 'mockAccessToken' });
      expect(service.validateUser).toHaveBeenCalledWith('testuser', 'password');
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: userPayload.username,
        sub: userPayload.id,
        roles: userPayload.roles,
      });
      expect(loggerService.log).toHaveBeenCalledWith(
        `Attempting to log in user: ${loginUserDto.username}`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `User logged in successfully: ${userPayload.username}`,
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.validateUser).toHaveBeenCalledWith('testuser', 'password');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    const user = {
      id: 'uuid-1',
      username: 'testuser',
      email: 'test@example.com',
      roles: [UserRole.USER],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return the user profile by ID', async () => {
      mockUsersService.findOne.mockResolvedValue(user);
      const result = await service.getProfile('uuid-1');

      expect(result).toEqual(user);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('uuid-1');
    });
  });
});
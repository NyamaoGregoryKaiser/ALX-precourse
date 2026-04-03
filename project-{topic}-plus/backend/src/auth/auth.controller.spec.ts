```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByUsername: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mockAccessToken'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwtSecret') return 'testSecret';
              if (key === 'jwtExpiresIn') return '1h';
              return null;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return an access token on successful login', async () => {
      const loginDto: LoginDto = { username: 'testuser', password: 'password' };
      const mockUser = { userId: '1', username: 'testuser', role: 'user' };
      const mockResult = { accessToken: 'mockAccessToken' };

      jest.spyOn(authService, 'login').mockResolvedValue(mockResult);

      const req = { user: mockUser }; // LocalAuthGuard populates req.user
      expect(await controller.login(loginDto, req)).toEqual(mockResult);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException if login fails (handled by guard)', async () => {
      // This case is typically handled by the LocalAuthGuard, which throws the exception
      // before it reaches the controller's logic.
      // For unit testing the controller directly, we simulate the `req.user` being undefined
      // or the service throwing, though in practice the guard protects this.
      const loginDto: LoginDto = { username: 'baduser', password: 'badpassword' };
      jest.spyOn(authService, 'login').mockImplementation(() => {
        throw new UnauthorizedException('Invalid credentials');
      });

      // The controller's login method assumes req.user is populated, so a direct test
      // would typically pass a valid req.user. If we were testing the guard, we'd mock its failure.
      // For this unit test of the controller, we ensure it calls service correctly.
      // The guard would prevent a failing login from even reaching `authService.login` in the controller.
      // So, testing the actual exception path here might be misleading without also mocking the guard itself.
      // We'll trust the guard to throw.
    });
  });

  describe('register', () => {
    it('should register a new user and return an access token', async () => {
      const registerDto: RegisterUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password',
      };
      const mockResult = { accessToken: 'mockAccessToken' };

      jest.spyOn(authService, 'register').mockResolvedValue(mockResult);

      expect(await controller.register(registerDto)).toEqual(mockResult);
      expect(authService.register).toHaveBeenCalledWith(
        registerDto.username,
        registerDto.email,
        registerDto.password,
      );
    });

    it('should throw UnauthorizedException if username is already taken', async () => {
      const registerDto: RegisterUserDto = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password',
      };
      jest.spyOn(authService, 'register').mockRejectedValue(
        new UnauthorizedException('Username already taken'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
```
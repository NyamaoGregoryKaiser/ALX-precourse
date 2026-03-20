const authService = require('../../services/auth.service');
const prisma = require('../../../prisma/client');
const bcryptUtil = require('../../utils/bcrypt.util');
const jwtUtil = require('../../utils/jwt.util');
const { USER_ROLES } = require('../../config/constants');

// Mock Prisma client
jest.mock('../../../prisma/client', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}));

// Mock bcrypt and jwt utils
jest.mock('../../utils/bcrypt.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn()
}));
jest.mock('../../utils/jwt.util', () => ({
  generateAuthTokens: jest.fn()
}));

describe('Auth Service', () => {
  const mockUser = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: USER_ROLES.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTokens = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // No existing user
      bcryptUtil.hashPassword.mockResolvedValue('newhashedpassword');
      prisma.user.create.mockResolvedValue({ ...mockUser, password: 'newhashedpassword' });
      jwtUtil.generateAuthTokens.mockReturnValue(mockTokens);

      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: USER_ROLES.MEMBER
      };

      const result = await authService.registerUser(userData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(bcryptUtil.hashPassword).toHaveBeenCalledWith(userData.password);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: userData.username,
          email: userData.email,
          password: 'newhashedpassword',
          role: userData.role
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true
        }
      });
      expect(jwtUtil.generateAuthTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role
        })
      );
      expect(result.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        })
      );
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw an error if user with email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); // User already exists

      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authService.registerUser(userData)).rejects.toThrow('User with this email already exists.');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: userData.email } });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should successfully log in an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcryptUtil.comparePassword.mockResolvedValue(true);
      jwtUtil.generateAuthTokens.mockReturnValue(mockTokens);

      const email = 'test@example.com';
      const password = 'password123';

      const result = await authService.loginUser(email, password);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcryptUtil.comparePassword).toHaveBeenCalledWith(password, mockUser.password);
      expect(jwtUtil.generateAuthTokens).toHaveBeenCalledWith(mockUser);
      expect(result.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        })
      );
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw an error for invalid email or password', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // User not found
      await expect(authService.loginUser('nonexistent@example.com', 'password123')).rejects.toThrow(
        'Invalid email or password.'
      );
      expect(bcryptUtil.comparePassword).not.toHaveBeenCalled();

      prisma.user.findUnique.mockResolvedValue(mockUser); // User found, but wrong password
      bcryptUtil.comparePassword.mockResolvedValue(false);
      await expect(authService.loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid email or password.'
      );
      expect(bcryptUtil.comparePassword).toHaveBeenCalledWith('wrongpassword', mockUser.password);
    });
  });
});
```

##### `src/tests/unit/project.service.test.js`

```javascript
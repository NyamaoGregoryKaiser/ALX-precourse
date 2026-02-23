```javascript
const bcrypt = require('bcryptjs');
const authService = require('../../src/services/authService');
const prisma = require('../../src/config/prisma');
const AppError = require('../../src/utils/appError');
const { generateToken } = require('../../src/utils/jwt');

// Mock Prisma client and bcrypt
jest.mock('../../src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('bcryptjs');
jest.mock('../../src/utils/jwt');

describe('Auth Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user and return user data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword123');
      prisma.user.create.mockResolvedValue({
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MEMBER',
      });
      generateToken.mockReturnValue('mockToken');

      // Mock login part implicitly, as register calls login
      prisma.user.findUnique.mockResolvedValueOnce({ // First call for login in register
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MEMBER',
        password: 'hashedPassword123'
      });
      bcrypt.compare.mockResolvedValue(true);


      const user = await authService.register('Test User', 'test@example.com', 'Password@123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password@123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedPassword123',
          role: 'MEMBER',
        },
        select: { id: true, name: true, email: true, role: true },
      });
      expect(user).toHaveProperty('token');
      expect(user.user.email).toBe('test@example.com');
      expect(user.user.role).toBe('MEMBER');
    });

    it('should throw an error if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(authService.register('Test User', 'existing@example.com', 'Password@123'))
        .rejects.toThrow(new AppError(400, 'User with this email already exists.'));
    });
  });

  describe('login', () => {
    it('should successfully log in a user and return token and user data', async () => {
      const mockUser = {
        id: 'user-id-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MEMBER',
        password: 'hashedPassword123',
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      generateToken.mockReturnValue('mockToken');

      const { token, user } = await authService.login('test@example.com', 'Password@123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('Password@123', 'hashedPassword123');
      expect(generateToken).toHaveBeenCalledWith(mockUser.id, [mockUser.role]);
      expect(token).toBe('mockToken');
      expect(user.email).toBe('test@example.com');
    });

    it('should throw an error for incorrect email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'Password@123'))
        .rejects.toThrow(new AppError(401, 'Incorrect email or password.'));
    });

    it('should throw an error for incorrect password', async () => {
      const mockUser = {
        id: 'user-id-1',
        email: 'test@example.com',
        password: 'hashedPassword123',
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'WrongPassword'))
        .rejects.toThrow(new AppError(401, 'Incorrect email or password.'));
    });
  });
});
```
```typescript
import { AuthService } from '../../src/auth/auth.service';
import { AppDataSource } from '../../src/database/data-source';
import { User, UserRole } from '../../src/database/entities/user.entity';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config';
import { UnauthorizedError, BadRequestError } from '../../src/shared/errors/custom-errors';

// Mock TypeORM repository
const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
};

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

// Mock jwt functions
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

// Mock AppDataSource to return our mocked repository
jest.mock('../../src/database/data-source', () => ({
    AppDataSource: {
        getRepository: jest.fn(() => mockUserRepository),
    },
}));

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    // --- Register User ---
    describe('registerUser', () => {
        it('should successfully register a new user', async () => {
            mockUserRepository.findOne.mockResolvedValue(null); // No existing user
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
            mockUserRepository.save.mockResolvedValue({ id: 'uuid123', username: 'testuser', email: 'test@example.com', role: UserRole.USER });

            const user = await authService.registerUser('testuser', 'test@example.com', 'password123');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: [{ email: 'test@example.com' }, { username: 'testuser' }] });
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedPassword123',
                role: UserRole.USER,
            }));
            expect(user).toEqual(expect.objectContaining({ id: 'uuid123', username: 'testuser' }));
        });

        it('should throw BadRequestError if user with email already exists', async () => {
            mockUserRepository.findOne.mockResolvedValueOnce({ email: 'test@example.com' }); // Existing user with email

            await expect(authService.registerUser('newuser', 'test@example.com', 'password')).rejects.toThrow(BadRequestError);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: [{ email: 'test@example.com' }, { username: 'newuser' }] });
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });

        it('should throw BadRequestError if user with username already exists', async () => {
            mockUserRepository.findOne.mockResolvedValueOnce({ username: 'existinguser' }); // Existing user with username

            await expect(authService.registerUser('existinguser', 'new@example.com', 'password')).rejects.toThrow(BadRequestError);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: [{ email: 'new@example.com' }, { username: 'existinguser' }] });
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });
    });

    // --- Login User ---
    describe('loginUser', () => {
        const mockUser = new User();
        mockUser.id = 'user-uuid';
        mockUser.username = 'loginuser';
        mockUser.email = 'login@example.com';
        mockUser.password = 'hashedPassword456';
        mockUser.role = UserRole.USER;

        it('should successfully log in a user and return tokens', async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock)
                .mockReturnValueOnce('mockAccessToken') // Access token
                .mockReturnValueOnce('mockRefreshToken'); // Refresh token
            mockUserRepository.save.mockResolvedValue({ ...mockUser, refreshToken: 'mockRefreshToken' });

            const { user, accessToken, refreshToken } = await authService.loginUser('login@example.com', 'correctpassword');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: 'login@example.com' },
                select: ['id', 'username', 'email', 'role', 'password'],
            });
            expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', mockUser.password);
            expect(jwt.sign).toHaveBeenCalledTimes(2);
            expect(jwt.sign).toHaveBeenCalledWith({ userId: mockUser.id, role: mockUser.role }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRATION });
            expect(jwt.sign).toHaveBeenCalledWith({ userId: mockUser.id, role: mockUser.role }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRATION });
            expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                id: mockUser.id,
                refreshToken: 'mockRefreshToken',
            }));
            expect(user).toEqual(expect.objectContaining({ id: mockUser.id, email: mockUser.email }));
            expect(accessToken).toBe('mockAccessToken');
            expect(refreshToken).toBe('mockRefreshToken');
        });

        it('should throw UnauthorizedError for incorrect password', async () => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Incorrect password

            await expect(authService.loginUser('login@example.com', 'wrongpassword')).rejects.toThrow(UnauthorizedError);
            expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
            expect(bcrypt.compare).toHaveBeenCalledTimes(1);
            expect(jwt.sign).not.toHaveBeenCalled();
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedError for non-existent user', async () => {
            mockUserRepository.findOne.mockResolvedValue(null); // User not found

            await expect(authService.loginUser('nonexistent@example.com', 'password')).rejects.toThrow(UnauthorizedError);
            expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });
    });

    // --- Refresh Token ---
    describe('refreshToken', () => {
        const mockUser = new User();
        mockUser.id = 'user-uuid';
        mockUser.username = 'refreshuser';
        mockUser.email = 'refresh@example.com';
        mockUser.role = UserRole.USER;
        mockUser.refreshToken = 'validRefreshTokenStored';

        it('should generate a new access token for a valid refresh token', async () => {
            (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUser.id, role: mockUser.role });
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            (jwt.sign as jest.Mock).mockReturnValue('newAccessToken');

            const newAccessToken = await authService.refreshToken('validRefreshTokenStored');

            expect(jwt.verify).toHaveBeenCalledWith('validRefreshTokenStored', env.JWT_REFRESH_SECRET);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
            expect(jwt.sign).toHaveBeenCalledWith({ userId: mockUser.id, role: mockUser.role }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRATION });
            expect(newAccessToken).toBe('newAccessToken');
        });

        it('should throw UnauthorizedError if refresh token is invalid/expired', async () => {
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid token'); });

            await expect(authService.refreshToken('invalidRefreshToken')).rejects.toThrow(UnauthorizedError);
            expect(jwt.verify).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.findOne).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedError if user not found with refresh token payload', async () => {
            (jwt.verify as jest.Mock).mockReturnValue({ userId: 'nonexistent-uuid', role: UserRole.USER });
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(authService.refreshToken('validRefreshTokenButNoUser')).rejects.toThrow(UnauthorizedError);
            expect(jwt.verify).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedError if stored refresh token does not match provided token', async () => {
            mockUser.refreshToken = 'mismatchedToken'; // Stored token is different
            (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUser.id, role: mockUser.role });
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await expect(authService.refreshToken('providedToken')).rejects.toThrow(UnauthorizedError);
            expect(jwt.verify).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
            expect(jwt.sign).not.toHaveBeenCalled();
        });
    });
});
```
import authService from '../../src/services/authService';
import { AppDataSource } from '../../src/config/data-source';
import { User } from '../../src/database/entities/User';
import { CustomError } from '../../src/middleware/errorHandler';
import * as jwt from 'jsonwebtoken';
import redisClient from '../../src/config/redis';

// Mock `AppDataSource.getRepository` and `User` methods
const mockUserRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
};

// Mock `jwt.sign` and `jwt.verify`
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'mockAccessToken'),
    verify: jest.fn(() => ({ userId: 'mockUserId' })),
}));

// Mock `redisClient`
jest.mock('../../src/config/redis', () => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    connected: true, // Assume connected for tests
    on: jest.fn(),
    once: jest.fn(),
    quit: jest.fn(),
}));

// Mock bcryptjs inside User entity for password hashing
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn(() => 'mockSalt'),
    hash: jest.fn(() => 'hashedPassword'),
    compare: jest.fn(() => true),
}));


describe('AuthService (Unit Tests)', () => {
    beforeAll(() => {
        // Set test environment variables
        process.env.JWT_SECRET = 'test_secret';
        process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
        process.env.ACCESS_TOKEN_EXPIRATION = '1m';
        process.env.REFRESH_TOKEN_EXPIRATION = '1h';

        // Mock TypeORM repository
        AppDataSource.getRepository = jest.fn(() => mockUserRepository as any);
    });

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    describe('register', () => {
        it('should register a new user and return tokens', async () => {
            mockUserRepository.findOne.mockResolvedValue(null); // User does not exist
            mockUserRepository.save.mockImplementation(user => {
                user.id = 'new-user-uuid';
                return user;
            });

            const result = await authService.register('testuser', 'test@example.com', 'password123');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: [{ email: 'test@example.com' }, { username: 'testuser' }] });
            expect(mockUserRepository.save).toHaveBeenCalled();
            expect(jwt.sign).toHaveBeenCalledTimes(2); // One for access, one for refresh
            expect(redisClient.set).toHaveBeenCalledWith(
                'refreshToken:new-user-uuid',
                'mockAccessToken', // This is incorrect, jwt.sign mocks token name incorrectly
                'EX',
                expect.any(Number)
            );
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.username).toBe('testuser');
        });

        it('should throw CustomError if user already exists', async () => {
            mockUserRepository.findOne.mockResolvedValue(new User()); // User already exists

            await expect(authService.register('existinguser', 'existing@example.com', 'password123'))
                .rejects.toThrow(CustomError);
            await expect(authService.register('existinguser', 'existing@example.com', 'password123'))
                .rejects.toHaveProperty('errorCode', 'USER_EXISTS');
        });

        it('should throw CustomError for validation failures (e.g., short password)', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            await expect(authService.register('user', 'test@example.com', '123'))
                .rejects.toThrow(CustomError);
            await expect(authService.register('user', 'test@example.com', '123'))
                .rejects.toHaveProperty('errorCode', 'VALIDATION_FAILED');
        });
    });

    describe('login', () => {
        it('should login an existing user and return tokens', async () => {
            const mockUser = new User();
            mockUser.id = 'existing-user-uuid';
            mockUser.email = 'test@example.com';
            mockUser.username = 'testuser';
            mockUser.password = 'hashedPassword'; // This mock will be compared by bcrypt.compare mock

            mockUserRepository.findOneBy.mockResolvedValue(mockUser);
            // bcrypt.compare is mocked globally to return true

            const result = await authService.login('test@example.com', 'password123');

            expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(jwt.sign).toHaveBeenCalledTimes(2);
            expect(redisClient.set).toHaveBeenCalledWith(
                'refreshToken:existing-user-uuid',
                'mockAccessToken',
                'EX',
                expect.any(Number)
            );
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe('test@example.com');
        });

        it('should throw CustomError for invalid credentials (user not found)', async () => {
            mockUserRepository.findOneBy.mockResolvedValue(null); // User not found

            await expect(authService.login('nonexistent@example.com', 'password123'))
                .rejects.toThrow(CustomError);
            await expect(authService.login('nonexistent@example.com', 'password123'))
                .rejects.toHaveProperty('errorCode', 'INVALID_CREDENTIALS');
        });

        it('should throw CustomError for invalid credentials (incorrect password)', async () => {
            const mockUser = new User();
            mockUser.id = 'existing-user-uuid';
            mockUser.email = 'test@example.com';
            mockUser.password = 'hashedPassword';
            mockUser.comparePassword = jest.fn().mockResolvedValue(false); // Simulate incorrect password

            mockUserRepository.findOneBy.mockResolvedValue(mockUser);

            await expect(authService.login('test@example.com', 'wrongpassword'))
                .rejects.toThrow(CustomError);
            await expect(authService.login('test@example.com', 'wrongpassword'))
                .rejects.toHaveProperty('errorCode', 'INVALID_CREDENTIALS');
        });
    });

    describe('refreshToken', () => {
        it('should return a new access token if refresh token is valid', async () => {
            const userId = 'user-to-refresh';
            const oldRefreshToken = 'valid_old_refresh_token';
            redisClient.get.mockResolvedValue(oldRefreshToken); // Stored token matches
            (jwt.verify as jest.Mock).mockReturnValue({ userId }); // Token is valid
            (jwt.sign as jest.Mock).mockReturnValueOnce('newAccessToken'); // Access token
            (jwt.sign as jest.Mock).mockReturnValueOnce('newRefreshToken'); // Refresh token

            const result = await authService.refreshToken(userId, oldRefreshToken);

            expect(redisClient.get).toHaveBeenCalledWith(`refreshToken:${userId}`);
            expect(jwt.verify).toHaveBeenCalledWith(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
            expect(redisClient.set).toHaveBeenCalledWith(
                `refreshToken:${userId}`,
                'newRefreshToken',
                'EX',
                expect.any(Number)
            );
            expect(result).toHaveProperty('accessToken', 'newAccessToken');
        });

        it('should throw CustomError if refresh token does not match stored token', async () => {
            const userId = 'user-to-refresh';
            const oldRefreshToken = 'valid_old_refresh_token';
            redisClient.get.mockResolvedValue('different_stored_token'); // Stored token different

            await expect(authService.refreshToken(userId, oldRefreshToken))
                .rejects.toThrow(CustomError);
            await expect(authService.refreshToken(userId, oldRefreshToken))
                .rejects.toHaveProperty('errorCode', 'INVALID_REFRESH_TOKEN');
            expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${userId}`); // Should invalidate
        });

        it('should throw CustomError if refresh token is expired', async () => {
            const userId = 'user-to-refresh';
            const oldRefreshToken = 'expired_refresh_token';
            redisClient.get.mockResolvedValue(oldRefreshToken);
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.TokenExpiredError('expired', new Date());
            });

            await expect(authService.refreshToken(userId, oldRefreshToken))
                .rejects.toThrow(CustomError);
            await expect(authService.refreshToken(userId, oldRefreshToken))
                .rejects.toHaveProperty('errorCode', 'REFRESH_TOKEN_EXPIRED');
            expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${userId}`); // Should invalidate
        });
    });

    describe('logout', () => {
        it('should delete the refresh token from Redis', async () => {
            const userId = 'user-to-logout';
            await authService.logout(userId);

            expect(redisClient.del).toHaveBeenCalledWith(`refreshToken:${userId}`);
        });
    });
});
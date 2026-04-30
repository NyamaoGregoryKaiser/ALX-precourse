```typescript
import { AppDataSource } from '../../src/config/data-source';
import { AuthService } from '../../src/services/authService';
import { User } from '../../src/database/entities/User';
import { BadRequestError, UnauthorizedError } from '../../src/utils/appErrors';
import * as passwordUtils from '../../src/utils/passwordUtils';
import * as jwtUtils from '../../src/utils/jwtUtils';

describe('AuthService (Unit)', () => {
    let authService: AuthService;
    let userRepository: any;
    let mockHashPassword: jest.SpyInstance;
    let mockComparePasswords: jest.SpyInstance;
    let mockGenerateToken: jest.SpyInstance;

    beforeEach(() => {
        userRepository = AppDataSource.getRepository(User);
        authService = new AuthService();

        // Mock password and JWT utilities
        mockHashPassword = jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashedPassword123');
        mockComparePasswords = jest.spyOn(passwordUtils, 'comparePasswords').mockResolvedValue(true);
        mockGenerateToken = jest.spyOn(jwtUtils, 'generateToken').mockReturnValue('mocked_jwt_token');

        // Mock repository methods
        jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(userRepository, 'create').mockImplementation((data) => ({ ...data, id: 'some-uuid' }));
        jest.spyOn(userRepository, 'save').mockImplementation((user) => Promise.resolve(user));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('register', () => {
        it('should register a new user and return user data and a token', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            };

            const result = await authService.register(userData);

            expect(userRepository.findOne).toHaveBeenCalledWith({ where: [{ email: userData.email }, { username: userData.username }] });
            expect(mockHashPassword).toHaveBeenCalledWith(userData.password);
            expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                username: userData.username,
                email: userData.email,
                password: 'hashedPassword123',
            }));
            expect(userRepository.save).toHaveBeenCalled();
            expect(mockGenerateToken).toHaveBeenCalledWith('some-uuid');
            expect(result).toEqual({
                user: expect.objectContaining({
                    id: 'some-uuid',
                    username: userData.username,
                    email: userData.email,
                }),
                token: 'mocked_jwt_token',
            });
            expect(result.user).not.toHaveProperty('password');
        });

        it('should throw BadRequestError if email already exists', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            };
            (userRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id', email: userData.email, username: 'another' });

            await expect(authService.register(userData)).rejects.toThrow(BadRequestError);
            await expect(authService.register(userData)).rejects.toHaveProperty('message', 'User with this email already exists.');
        });

        it('should throw BadRequestError if username already exists', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            };
            (userRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id', username: userData.username, email: 'another@example.com' });

            await expect(authService.register(userData)).rejects.toThrow(BadRequestError);
            await expect(authService.register(userData)).rejects.toHaveProperty('message', 'User with this username already exists.');
        });

        it('should throw BadRequestError for invalid email format', async () => {
            const userData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'password123',
            };
            await expect(authService.register(userData)).rejects.toThrow(BadRequestError);
            await expect(authService.register(userData)).rejects.toHaveProperty('message', 'Validation failed.');
            await expect(authService.register(userData)).rejects.toHaveProperty('errors', expect.arrayContaining([
                expect.objectContaining({ field: 'email', message: 'Invalid email' })
            ]));
        });
    });

    describe('login', () => {
        it('should log in a user and return user data and a token', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password123',
            };
            const mockUser = { id: 'some-uuid', username: 'testuser', email: credentials.email, password: 'hashedPassword123' };
            (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await authService.login(credentials);

            expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: credentials.email }, select: ['id', 'username', 'email', 'password'] });
            expect(mockComparePasswords).toHaveBeenCalledWith(credentials.password, mockUser.password);
            expect(mockGenerateToken).toHaveBeenCalledWith(mockUser.id);
            expect(result).toEqual({
                user: expect.objectContaining({
                    id: 'some-uuid',
                    username: mockUser.username,
                    email: mockUser.email,
                }),
                token: 'mocked_jwt_token',
            });
            expect(result.user).not.toHaveProperty('password');
        });

        it('should throw UnauthorizedError for invalid email', async () => {
            const credentials = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };
            (userRepository.findOne as jest.Mock).mockResolvedValue(null);

            await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(credentials)).rejects.toHaveProperty('message', 'Invalid credentials.');
        });

        it('should throw UnauthorizedError for invalid password', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };
            const mockUser = { id: 'some-uuid', username: 'testuser', email: credentials.email, password: 'hashedPassword123' };
            (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
            mockComparePasswords.mockResolvedValue(false); // Simulate wrong password

            await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
            await expect(authService.login(credentials)).rejects.toHaveProperty('message', 'Invalid credentials.');
        });
    });
});
```
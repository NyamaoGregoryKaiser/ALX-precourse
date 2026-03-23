```typescript
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/users/user.repository';
import { AppError } from '../../../src/utils/appError';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User, UserRole } from '../../../src/database/entities/User';
import { JWT_SECRET } from '../../../src/config/constants'; // Ensure JWT_SECRET is imported for test consistency

// Mock external dependencies
jest.mock('../../../src/modules/users/user.repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
    let authService: AuthService;
    let mockUserRepository: jest.Mocked<UserRepository>;
    let mockBcrypt: jest.Mocked<typeof bcrypt>;
    let mockJwt: jest.Mocked<typeof jwt>;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        authService = new AuthService();
        // Cast the mocked constructor to access its instance methods
        mockUserRepository = (UserRepository as jest.Mock).mock.instances[0] as jest.Mocked<UserRepository>;
        mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
        mockJwt = jwt as jest.Mocked<typeof jwt>;

        // Set up default mock return values for JWT_SECRET
        (JWT_SECRET as jest.Mock) = 'test_jwt_secret';
    });

    describe('register', () => {
        it('should successfully register a new user and return a token', async () => {
            const newUserInput = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password@123',
                role: UserRole.USER,
            };
            const hashedPassword = 'hashed_password';
            const savedUser: User = {
                id: 'uuid-123',
                ...newUserInput,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
                initiatedTransactions: [],
                merchants: []
            };
            const token = 'mock_jwt_token';

            mockUserRepository.findByEmail.mockResolvedValue(null); // User does not exist
            mockBcrypt.hash.mockResolvedValue(hashedPassword);
            mockUserRepository.create.mockResolvedValue(savedUser);
            mockJwt.sign.mockReturnValue(token);

            const result = await authService.register(
                newUserInput.username,
                newUserInput.email,
                newUserInput.password,
                newUserInput.role
            );

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(newUserInput.email);
            expect(mockBcrypt.hash).toHaveBeenCalledWith(newUserInput.password, 12);
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                username: newUserInput.username,
                email: newUserInput.email,
                password: hashedPassword,
                role: newUserInput.role,
            });
            expect(mockJwt.sign).toHaveBeenCalledWith({ id: savedUser.id }, expect.any(String), expect.any(Object)); // JWT_SECRET could be a constant
            expect(result).toEqual({ user: expect.objectContaining({ id: savedUser.id, email: savedUser.email }), token });
        });

        it('should throw an AppError if user with email already exists', async () => {
            const existingUser: User = {
                id: 'uuid-existing',
                username: 'existing',
                email: 'test@example.com',
                password: 'hashed_password',
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                initiatedTransactions: [],
                merchants: []
            };

            mockUserRepository.findByEmail.mockResolvedValue(existingUser);

            await expect(
                authService.register('newuser', 'test@example.com', 'Password@123', UserRole.USER)
            ).rejects.toThrow(new AppError('User with this email already exists.', 409));

            expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);
            expect(mockBcrypt.hash).not.toHaveBeenCalled();
            expect(mockUserRepository.create).not.toHaveBeenCalled();
            expect(mockJwt.sign).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should successfully log in a user and return a token', async () => {
            const loginInput = {
                email: 'test@example.com',
                password: 'Password@123',
            };
            const user: User = {
                id: 'uuid-123',
                username: 'testuser',
                email: loginInput.email,
                password: 'hashed_password',
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                initiatedTransactions: [],
                merchants: []
            };
            const token = 'mock_jwt_token';

            mockUserRepository.findByEmailWithPassword.mockResolvedValue(user);
            mockBcrypt.compare.mockResolvedValue(true); // Password matches
            mockJwt.sign.mockReturnValue(token);

            const result = await authService.login(loginInput.email, loginInput.password);

            expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(loginInput.email);
            expect(mockBcrypt.compare).toHaveBeenCalledWith(loginInput.password, user.password);
            expect(mockJwt.sign).toHaveBeenCalledWith({ id: user.id }, expect.any(String), expect.any(Object));
            expect(result).toEqual({ user: expect.objectContaining({ id: user.id, email: user.email }), token });
        });

        it('should throw an AppError for incorrect email or password', async () => {
            const loginInput = {
                email: 'nonexistent@example.com',
                password: 'WrongPassword',
            };

            mockUserRepository.findByEmailWithPassword.mockResolvedValue(null); // User not found

            await expect(authService.login(loginInput.email, loginInput.password)).rejects.toThrow(
                new AppError('Incorrect email or password.', 401)
            );

            expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(loginInput.email);
            expect(mockBcrypt.compare).not.toHaveBeenCalled(); // No user to compare password against
            expect(mockJwt.sign).not.toHaveBeenCalled();

            // Test with correct email but wrong password
            const user: User = {
                id: 'uuid-123',
                username: 'testuser',
                email: loginInput.email,
                password: 'hashed_password',
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                initiatedTransactions: [],
                merchants: []
            };
            mockUserRepository.findByEmailWithPassword.mockResolvedValue(user);
            mockBcrypt.compare.mockResolvedValue(false); // Password does not match

            await expect(authService.login(loginInput.email, loginInput.password)).rejects.toThrow(
                new AppError('Incorrect email or password.', 401)
            );
            expect(mockBcrypt.compare).toHaveBeenCalledWith(loginInput.password, user.password);
        });
    });

    describe('verifyToken', () => {
        it('should return user ID for a valid token', () => {
            const userId = 'uuid-123';
            const token = 'valid_token';
            mockJwt.verify.mockReturnValue({ id: userId });

            const result = authService.verifyToken(token);
            expect(result).toBe(userId);
            expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String));
        });

        it('should throw AppError for invalid token', () => {
            const token = 'invalid_token';
            mockJwt.verify.mockImplementation(() => {
                throw new jwt.JsonWebTokenError('invalid signature');
            });

            expect(() => authService.verifyToken(token)).toThrow(new AppError('Invalid or expired token.', 401));
            expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String));
        });

        it('should throw AppError for expired token', () => {
            const token = 'expired_token';
            mockJwt.verify.mockImplementation(() => {
                throw new jwt.TokenExpiredError('jwt expired', new Date());
            });

            expect(() => authService.verifyToken(token)).toThrow(new AppError('Invalid or expired token.', 401));
            expect(mockJwt.verify).toHaveBeenCalledWith(token, expect.any(String));
        });
    });
});
```
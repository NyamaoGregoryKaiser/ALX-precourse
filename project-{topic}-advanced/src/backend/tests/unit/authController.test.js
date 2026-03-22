```javascript
const { register, login } = require('../../controllers/authController');
const User = require('../../models/User');
const AppError = require('../../utils/appError');
const { generateToken } = require('../../utils/jwtUtils');
const { StatusCodes } = require('http-status-codes');

// Mock User model and jwtUtils
jest.mock('../../models/User');
jest.mock('../../utils/jwtUtils');

describe('authController Unit Tests', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            body: {},
            user: null,
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    // --- Register Tests ---
    describe('register', () => {
        it('should register a new user and return a token', async () => {
            mockReq.body = {
                email: 'newuser@example.com',
                password: 'password123',
                role: 'user'
            };
            const newUser = { id: 'uuid-123', email: 'newuser@example.com', role: 'user' };

            User.create.mockResolvedValue(newUser);
            generateToken.mockReturnValue('mock-jwt-token');

            await register(mockReq, mockRes, mockNext);

            expect(User.create).toHaveBeenCalledWith({
                email: 'newuser@example.com',
                password: 'password123',
                role: 'user'
            });
            expect(generateToken).toHaveBeenCalledWith(newUser.id, newUser.role);
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                token: 'mock-jwt-token',
                data: {
                    user: {
                        id: newUser.id,
                        email: newUser.email,
                        role: newUser.role,
                    },
                },
            });
        });

        it('should register a new user with default role if not provided', async () => {
            mockReq.body = {
                email: 'defaultuser@example.com',
                password: 'password123',
            };
            const newUser = { id: 'uuid-456', email: 'defaultuser@example.com', role: 'user' };

            User.create.mockResolvedValue(newUser);
            generateToken.mockReturnValue('mock-jwt-token');

            await register(mockReq, mockRes, mockNext);

            expect(User.create).toHaveBeenCalledWith({
                email: 'defaultuser@example.com',
                password: 'password123',
                role: 'user'
            });
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CREATED);
        });


        it('should call next with AppError if role is "admin"', async () => {
            mockReq.body = {
                email: 'adminwannabe@example.com',
                password: 'password123',
                role: 'admin'
            };

            await register(mockReq, mockRes, mockNext);

            expect(User.create).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(
                expect.any(AppError)
            );
            expect(mockNext.mock.calls[0][0].statusCode).toBe(StatusCodes.FORBIDDEN);
            expect(mockNext.mock.calls[0][0].message).toBe('Unauthorized attempt to set admin role.');
        });

        it('should call next with error if user creation fails (e.g., duplicate email)', async () => {
            mockReq.body = {
                email: 'duplicate@example.com',
                password: 'password123',
            };
            const duplicateError = new Error('Duplicate entry');
            duplicateError.name = 'SequelizeUniqueConstraintError'; // Mimic Sequelize error
            duplicateError.errors = [{ message: 'email must be unique' }]; // For error handling

            User.create.mockRejectedValue(duplicateError);

            await register(mockReq, mockRes, mockNext);

            expect(User.create).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(duplicateError); // Error should be passed to global error handler
        });
    });

    // --- Login Tests ---
    describe('login', () => {
        it('should log in a user and return a token if credentials are valid', async () => {
            mockReq.body = {
                email: 'test@example.com',
                password: 'password123',
            };
            const existingUser = {
                id: 'uuid-user-1',
                email: 'test@example.com',
                role: 'user',
                comparePassword: jest.fn().mockResolvedValue(true),
            };

            User.scope.mockReturnThis(); // Mock scope method to return User directly
            User.findOne.mockResolvedValue(existingUser);
            generateToken.mockReturnValue('mock-jwt-token');

            await login(mockReq, mockRes, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
            expect(existingUser.comparePassword).toHaveBeenCalledWith('password123');
            expect(generateToken).toHaveBeenCalledWith(existingUser.id, existingUser.role);
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                token: 'mock-jwt-token',
                data: {
                    user: {
                        id: existingUser.id,
                        email: existingUser.email,
                        role: existingUser.role,
                    },
                },
            });
        });

        it('should call next with AppError for missing email or password', async () => {
            mockReq.body = { email: 'test@example.com' }; // Missing password

            await login(mockReq, mockRes, mockNext);

            expect(User.findOne).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(
                expect.any(AppError)
            );
            expect(mockNext.mock.calls[0][0].statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(mockNext.mock.calls[0][0].message).toBe('Please provide email and password!');
        });

        it('should call next with AppError for incorrect email', async () => {
            mockReq.body = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };

            User.scope.mockReturnThis();
            User.findOne.mockResolvedValue(null); // User not found

            await login(mockReq, mockRes, mockNext);

            expect(User.findOne).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(
                expect.any(AppError)
            );
            expect(mockNext.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
            expect(mockNext.mock.calls[0][0].message).toBe('Incorrect email or password');
        });

        it('should call next with AppError for incorrect password', async () => {
            mockReq.body = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };
            const existingUser = {
                id: 'uuid-user-1',
                email: 'test@example.com',
                role: 'user',
                comparePassword: jest.fn().mockResolvedValue(false), // Incorrect password
            };

            User.scope.mockReturnThis();
            User.findOne.mockResolvedValue(existingUser);

            await login(mockReq, mockRes, mockNext);

            expect(User.findOne).toHaveBeenCalled();
            expect(existingUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
            expect(mockNext).toHaveBeenCalledWith(
                expect.any(AppError)
            );
            expect(mockNext.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
            expect(mockNext.mock.calls[0][0].message).toBe('Incorrect email or password');
        });
    });
});
```
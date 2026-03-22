```javascript
const errorHandler = require('../../middleware/errorHandler');
const AppError = require('../../utils/appError');
const { StatusCodes } = require('http-status-codes');
const logger = require('../../utils/logger'); // Mock logger for production errors

// Mock logger to prevent actual console output during tests
jest.mock('../../utils/logger', () => ({
    error: jest.fn(),
}));

describe('errorHandler Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks(); // Clear mocks before each test
    });

    // Test for development environment
    describe('Development Environment', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        beforeAll(() => {
            process.env.NODE_ENV = 'development';
        });
        afterAll(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should send detailed error response for AppError', () => {
            const err = new AppError('Test Error', StatusCodes.BAD_REQUEST);
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'fail',
                    message: 'Test Error',
                    error: expect.any(AppError),
                    stack: expect.any(String),
                })
            );
        });

        it('should send detailed error response for generic Error', () => {
            const err = new Error('Something went wrong!');
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    message: 'Something went wrong!',
                    error: expect.any(Error),
                    stack: expect.any(String),
                })
            );
        });
    });

    // Test for production environment
    describe('Production Environment', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        beforeAll(() => {
            process.env.NODE_ENV = 'production';
        });
        afterAll(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should send generic error response for programming errors', () => {
            const err = new Error('Unexpected database shutdown!'); // A programming error
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(logger.error).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Something went very wrong!',
            });
        });

        it('should send operational message for AppError', () => {
            const err = new AppError('Invalid input data', StatusCodes.BAD_REQUEST);
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(logger.error).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Invalid input data',
            });
        });

        it('should handle SequelizeUniqueConstraintError (duplicate field)', () => {
            const err = new Error('Duplicate entry');
            err.name = 'SequelizeUniqueConstraintError';
            err.errors = [{ message: 'Validation error: Validation is email unique' }]; // Mock error structure
            const mockDuplicateValue = '"test@example.com"'; // Value that would be extracted

            // Mock the regex match for the duplicate value
            // This is a bit brittle, but reflects the current implementation
            const originalMatch = String.prototype.match;
            String.prototype.match = jest.fn((regex) => {
                if (regex.toString().includes('(["\'])(\\?.)*?\\1')) {
                    return [mockDuplicateValue, '"'];
                }
                return originalMatch.call(err.errors[0].message, regex);
            });

            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: `Duplicate field value: ${mockDuplicateValue}. Please use another value!`,
            });
            String.prototype.match = originalMatch; // Restore original match
        });

        it('should handle SequelizeValidationError', () => {
            const err = new Error('Validation failed');
            err.name = 'SequelizeValidationError';
            err.errors = [
                { message: 'Path `email` is required.' },
                { message: 'Path `password` length must be at least 8.' },
            ];
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Invalid input data. Path `email` is required.. Path `password` length must be at least 8..',
            });
        });

        it('should handle JsonWebTokenError', () => {
            const err = new Error('invalid token');
            err.name = 'JsonWebTokenError';
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Invalid token. Please log in again!',
            });
        });

        it('should handle TokenExpiredError', () => {
            const err = new Error('jwt expired');
            err.name = 'TokenExpiredError';
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Your token has expired! Please log in again.',
            });
        });

        it('should handle SequelizeDatabaseError for invalid UUID', () => {
            const err = new Error('invalid input syntax for type uuid');
            err.name = 'SequelizeDatabaseError';
            err.parent = { code: '22P02' }; // PostgreSQL error code for invalid text representation
            mockReq.params = { id: 'invalid-uuid' }; // Simulate invalid ID in request params
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Invalid id: invalid-uuid.',
            });
        });

        it('should handle custom role error from controller', () => {
            const err = new AppError('Unauthorized attempt to set admin role.', StatusCodes.FORBIDDEN);
            errorHandler(err, mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Unauthorized attempt to set admin role.',
            });
        });
    });
});
```
```javascript
// tests/unit/services/auth.service.test.js
const { authService, userService, tokenService } = require('../../../src/services');
const { User } = require('../../../src/models');
const { ApiError } = require('../../../src/utils/ApiError');
const httpStatus = require('http-status');
const { faker } = require('@faker-js/faker');
const { tokenTypes } = require('../../../src/config/tokens');

// ALX Principle: Unit Testing
// Test individual functions/modules in isolation, mocking dependencies.

describe('Auth Service', () => {
    // Mock user data for consistent testing
    const mockUser = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        password: 'Password123!',
        isPasswordMatch: jest.fn().mockResolvedValue(true), // Mock password check
        role: 'user',
        toJSON: jest.fn(function() { return { ...this, id: this.id } }) // Mock toJSON for model instances
    };

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        mockUser.isPasswordMatch.mockResolvedValue(true);
    });

    describe('loginUserWithEmailAndPassword', () => {
        test('should return user object if email and password are correct', async () => {
            // Mock userService to return a user
            userService.getUserByEmail = jest.fn().mockResolvedValue(mockUser);

            const user = await authService.loginUserWithEmailAndPassword(mockUser.email, mockUser.password);

            expect(userService.getUserByEmail).toHaveBeenCalledWith(mockUser.email);
            expect(mockUser.isPasswordMatch).toHaveBeenCalledWith(mockUser.password);
            expect(user).toEqual(mockUser);
        });

        test('should throw 401 error if email not found', async () => {
            userService.getUserByEmail = jest.fn().mockResolvedValue(null);

            await expect(authService.loginUserWithEmailAndPassword('nonexistent@example.com', 'password'))
                .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
            expect(userService.getUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
            expect(mockUser.isPasswordMatch).not.toHaveBeenCalled(); // Password check should not happen
        });

        test('should throw 401 error if password does not match', async () => {
            userService.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
            mockUser.isPasswordMatch.mockResolvedValue(false); // Simulate incorrect password

            await expect(authService.loginUserWithEmailAndPassword(mockUser.email, 'wrongpassword'))
                .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password'));
            expect(userService.getUserByEmail).toHaveBeenCalledWith(mockUser.email);
            expect(mockUser.isPasswordMatch).toHaveBeenCalledWith('wrongpassword');
        });
    });

    describe('logout', () => {
        test('should delete refresh token if valid', async () => {
            const mockRefreshTokenDoc = {
                token: 'valid_refresh_token',
                userId: mockUser.id,
                expires: faker.date.future(),
                type: tokenTypes.REFRESH,
                blacklisted: false,
                destroy: jest.fn().mockResolvedValue(true),
            };
            tokenService.verifyToken = jest.fn().mockResolvedValue(mockRefreshTokenDoc);

            await authService.logout(mockRefreshTokenDoc.token);

            expect(tokenService.verifyToken).toHaveBeenCalledWith(mockRefreshTokenDoc.token, tokenTypes.REFRESH);
            expect(mockRefreshTokenDoc.destroy).toHaveBeenCalled();
        });

        test('should throw 404 error if refresh token not found or invalid', async () => {
            tokenService.verifyToken = jest.fn().mockRejectedValue(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));

            await expect(authService.logout('invalid_refresh_token'))
                .rejects.toThrow(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token')); // Propagates from tokenService

            expect(tokenService.verifyToken).toHaveBeenCalledWith('invalid_refresh_token', tokenTypes.REFRESH);
        });
    });
});
```
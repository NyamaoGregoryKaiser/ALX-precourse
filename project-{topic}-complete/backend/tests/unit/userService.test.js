```javascript
const UserService = require('../../src/services/userService');
const { User, Cart } = require('../../src/config/db');
const { AppError } = require('../../src/utils/appError');
const { generateToken } = require('../../src/utils/jwt');
const bcrypt = require('bcryptjs');

// Mock Sequelize models and their methods
jest.mock('../../src/config/db', () => ({
    User: {
        create: jest.fn(),
        findOne: jest.fn(),
        findByPk: jest.fn(),
        destroy: jest.fn()
    },
    Cart: {
        create: jest.fn()
    },
    sequelize: { // Mock sequelize for transaction (even if not used directly in unit service)
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

jest.mock('../../src/utils/jwt', () => ({
    generateToken: jest.fn(() => 'mock_jwt_token')
}));

jest.mock('bcryptjs', () => ({
    genSalt: jest.fn(() => 'mock_salt'),
    hash: jest.fn(() => 'hashed_password'),
    compare: jest.fn(() => true)
}));

describe('UserService Unit Tests', () => {
    // Clear mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Register User Tests ---
    describe('registerUser', () => {
        it('should successfully register a new user and create a cart', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const createdUser = {
                id: 'user-id-123',
                username: userData.username,
                email: userData.email,
                role: 'user',
                toJSON: () => ({ id: 'user-id-123', username: userData.username, email: userData.email, role: 'user', password: 'hashed_password' }) // Mock toJSON for de-structuring
            };

            User.findOne.mockResolvedValue(null); // User does not exist
            User.create.mockResolvedValue(createdUser);
            Cart.create.mockResolvedValue({}); // Cart created successfully

            const result = await UserService.registerUser(userData);

            expect(User.findOne).toHaveBeenCalledWith({ where: { email: userData.email } });
            expect(User.create).toHaveBeenCalledWith(userData);
            expect(Cart.create).toHaveBeenCalledWith({ userId: createdUser.id });
            expect(generateToken).toHaveBeenCalledWith(createdUser.id);
            expect(result).toEqual({
                user: {
                    id: createdUser.id,
                    username: createdUser.username,
                    email: createdUser.email,
                    role: createdUser.role
                },
                token: 'mock_jwt_token'
            });
        });

        it('should throw AppError if user with email already exists', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            User.findOne.mockResolvedValue({ email: userData.email }); // User exists

            await expect(UserService.registerUser(userData)).rejects.toThrow(AppError);
            await expect(UserService.registerUser(userData)).rejects.toHaveProperty('statusCode', 400);
            expect(User.create).not.toHaveBeenCalled();
            expect(Cart.create).not.toHaveBeenCalled();
        });
    });

    // --- Login User Tests ---
    describe('loginUser', () => {
        it('should successfully log in a user and return token', async () => {
            const loginData = { email: 'test@example.com', password: 'password123' };
            const existingUser = {
                id: 'user-id-123',
                email: loginData.email,
                username: 'testuser',
                role: 'user',
                password: 'hashed_password',
                comparePassword: bcrypt.compare // Mock this method directly on the object
            };
            User.findOne.mockResolvedValue(existingUser);
            bcrypt.compare.mockResolvedValue(true); // Password matches

            const result = await UserService.loginUser(loginData.email, loginData.password);

            expect(User.findOne).toHaveBeenCalledWith({ where: { email: loginData.email } });
            expect(existingUser.comparePassword).toHaveBeenCalledWith(loginData.password);
            expect(generateToken).toHaveBeenCalledWith(existingUser.id);
            expect(result).toEqual({
                user: {
                    id: existingUser.id,
                    username: existingUser.username,
                    email: existingUser.email,
                    role: existingUser.role
                },
                token: 'mock_jwt_token'
            });
        });

        it('should throw AppError for invalid credentials (user not found)', async () => {
            User.findOne.mockResolvedValue(null); // User not found
            await expect(UserService.loginUser('nonexistent@example.com', 'password')).rejects.toThrow(AppError);
            await expect(UserService.loginUser('nonexistent@example.com', 'password')).rejects.toHaveProperty('statusCode', 401);
        });

        it('should throw AppError for invalid credentials (incorrect password)', async () => {
            const loginData = { email: 'test@example.com', password: 'wrongpassword' };
            const existingUser = {
                id: 'user-id-123',
                email: loginData.email,
                password: 'hashed_password',
                comparePassword: bcrypt.compare
            };
            User.findOne.mockResolvedValue(existingUser);
            bcrypt.compare.mockResolvedValue(false); // Password mismatch

            await expect(UserService.loginUser(loginData.email, loginData.password)).rejects.toThrow(AppError);
            await expect(UserService.loginUser(loginData.email, loginData.password)).rejects.toHaveProperty('statusCode', 401);
        });
    });

    // --- Get User By ID Tests ---
    describe('getUserById', () => {
        it('should return user details if user exists', async () => {
            const userId = 'user-id-123';
            const user = { id: userId, username: 'testuser', email: 'test@example.com' };
            User.findByPk.mockResolvedValue(user);

            const result = await UserService.getUserById(userId);
            expect(User.findByPk).toHaveBeenCalledWith(userId, { attributes: { exclude: ['password'] } });
            expect(result).toEqual(user);
        });

        it('should throw AppError if user does not exist', async () => {
            User.findByPk.mockResolvedValue(null);
            await expect(UserService.getUserById('non-existent-id')).rejects.toThrow(AppError);
            await expect(UserService.getUserById('non-existent-id')).rejects.toHaveProperty('statusCode', 404);
        });
    });

    // --- Update User Profile Tests ---
    describe('updateUserProfile', () => {
        it('should update user profile successfully', async () => {
            const userId = 'user-id-123';
            const updateData = { username: 'newusername', email: 'newemail@example.com' };
            const existingUser = {
                id: userId,
                username: 'oldusername',
                email: 'oldemail@example.com',
                password: 'hashed_password',
                save: jest.fn().mockResolvedValue(true),
                toJSON: jest.fn(() => ({
                    id: userId,
                    username: 'newusername',
                    email: 'newemail@example.com',
                    password: 'hashed_password'
                }))
            };
            User.findByPk.mockResolvedValue(existingUser);

            const result = await UserService.updateUserProfile(userId, updateData);

            expect(User.findByPk).toHaveBeenCalledWith(userId);
            expect(existingUser.username).toBe(updateData.username);
            expect(existingUser.email).toBe(updateData.email);
            expect(existingUser.save).toHaveBeenCalled();
            expect(result).toEqual({
                id: userId,
                username: 'newusername',
                email: 'newemail@example.com'
            });
        });

        it('should throw AppError if user not found for update', async () => {
            User.findByPk.mockResolvedValue(null);
            await expect(UserService.updateUserProfile('non-existent-id', { username: 'new' })).rejects.toThrow(AppError);
            await expect(UserService.updateUserProfile('non-existent-id', { username: 'new' })).rejects.toHaveProperty('statusCode', 404);
        });
    });

    // --- Change Password Tests ---
    describe('changePassword', () => {
        it('should change user password successfully', async () => {
            const userId = 'user-id-123';
            const existingUser = {
                id: userId,
                password: 'old_hashed_password',
                comparePassword: jest.fn().mockResolvedValue(true),
                save: jest.fn().mockResolvedValue(true)
            };
            User.findByPk.mockResolvedValue(existingUser);

            await UserService.changePassword(userId, 'current_password', 'new_password');

            expect(User.findByPk).toHaveBeenCalledWith(userId);
            expect(existingUser.comparePassword).toHaveBeenCalledWith('current_password');
            expect(existingUser.password).toBe('new_password'); // Password will be hashed by hook before save
            expect(existingUser.save).toHaveBeenCalled();
        });

        it('should throw AppError if user not found for password change', async () => {
            User.findByPk.mockResolvedValue(null);
            await expect(UserService.changePassword('non-existent-id', 'current', 'new')).rejects.toThrow(AppError);
            await expect(UserService.changePassword('non-existent-id', 'current', 'new')).rejects.toHaveProperty('statusCode', 404);
        });

        it('should throw AppError if current password is incorrect', async () => {
            const userId = 'user-id-123';
            const existingUser = {
                id: userId,
                password: 'old_hashed_password',
                comparePassword: jest.fn().mockResolvedValue(false),
                save: jest.fn()
            };
            User.findByPk.mockResolvedValue(existingUser);

            await expect(UserService.changePassword(userId, 'wrong_current', 'new')).rejects.toThrow(AppError);
            await expect(UserService.changePassword(userId, 'wrong_current', 'new')).rejects.toHaveProperty('statusCode', 401);
            expect(existingUser.save).not.toHaveBeenCalled();
        });
    });

    // --- Delete User Tests (Admin) ---
    describe('deleteUser', () => {
        it('should delete a user successfully', async () => {
            const userId = 'user-id-123';
            const existingUser = {
                id: userId,
                destroy: jest.fn().mockResolvedValue(true)
            };
            User.findByPk.mockResolvedValue(existingUser);

            await UserService.deleteUser(userId);

            expect(User.findByPk).toHaveBeenCalledWith(userId);
            expect(existingUser.destroy).toHaveBeenCalled();
        });

        it('should throw AppError if user not found for deletion', async () => {
            User.findByPk.mockResolvedValue(null);
            await expect(UserService.deleteUser('non-existent-id')).rejects.toThrow(AppError);
            await expect(UserService.deleteUser('non-existent-id')).rejects.toHaveProperty('statusCode', 404);
        });
    });
});
```
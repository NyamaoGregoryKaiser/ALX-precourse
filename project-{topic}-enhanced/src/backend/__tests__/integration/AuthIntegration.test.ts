import { AppDataSource } from '../../database/data-source';
import { User } from '../../entities/User';
import { AuthController } from '../../controllers/AuthController';
import { AuthService } from '../../services/AuthService';
import { UserService } from '../../services/UserService';
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { comparePassword, hashPassword } from '../../utils/hash';
import { generateAuthToken } from '../../utils/jwt';

// Mock dependencies if they make external calls (e.g., mailer, external API)
// For database interaction, we use the real database configured for tests.
jest.mock('../../utils/logger'); // Don't log during tests

describe('AuthIntegration Tests', () => {
    let authController: AuthController;
    let userService: UserService;
    let authService: AuthService;
    let mockResponse: Partial<Response>;

    beforeAll(async () => {
        await AppDataSource.initialize();
        userService = new UserService();
        authService = new AuthService(userService);
        authController = new AuthController(authService);
    });

    beforeEach(async () => {
        // Clean database before each test
        const entities = AppDataSource.entityMetadatas;
        for (const entity of entities) {
            const repository = AppDataSource.getRepository(entity.name);
            await repository.clear();
        }

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            cookie: jest.fn()
        };
    });

    afterAll(async () => {
        await AppDataSource.destroy();
    });

    it('should register a new user and return a token', async () => {
        const mockRequest = {
            body: {
                username: 'integrationtestuser',
                email: 'integration@example.com',
                password: 'password123',
            },
        } as Request;

        await authController.register(mockRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalled();
        const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseBody).toHaveProperty('token');
        expect(responseBody).toHaveProperty('user');
        expect(responseBody.user.email).toBe('integration@example.com');

        // Verify user is in DB
        const user = await userService.findUserByEmail('integration@example.com');
        expect(user).toBeDefined();
        expect(user?.username).toBe('integrationtestuser');
        expect(await comparePassword('password123', user!.password)).toBe(true);
    });

    it('should log in an existing user and return a token', async () => {
        const hashedPassword = await hashPassword('password123');
        const user = AppDataSource.getRepository(User).create({
            username: 'existinguser',
            email: 'existing@example.com',
            password: hashedPassword,
        });
        await AppDataSource.getRepository(User).save(user);

        const mockRequest = {
            body: {
                email: 'existing@example.com',
                password: 'password123',
            },
        } as Request;

        await authController.login(mockRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalled();
        const responseBody = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(responseBody).toHaveProperty('token');
        expect(responseBody).toHaveProperty('user');
        expect(responseBody.user.email).toBe('existing@example.com');
    });

    it('should return 400 for invalid login credentials', async () => {
        const mockRequest = {
            body: {
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            },
        } as Request;

        await authController.login(mockRequest, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
});
```

**API Test Example: `src/backend/__tests__/api/AuthAPI.test.ts`**
```typescript
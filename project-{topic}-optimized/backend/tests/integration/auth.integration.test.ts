```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/database/data-source';
import app from '../../src/app';
import { User, UserRole } from '../../src/database/entities/User';
import * as bcrypt from 'bcryptjs';
import { API_PREFIX } from '../../src/config/constants';
import { redisClient } from '../../src/services/cache.service'; // Import redis client

describe('Auth API Integration Tests', () => {
    let userRepository;

    beforeAll(async () => {
        // Initialize TypeORM Data Source
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        userRepository = AppDataSource.getRepository(User);

        // Ensure Redis is connected and clear for tests
        if (!redisClient.isReady) {
            await redisClient.connect();
        }
        await redisClient.flushAll(); // Clear Redis cache before tests
        console.log('Redis flushed for integration tests.');

        // Clear database before tests
        await userRepository.delete({});
    });

    afterEach(async () => {
        // Clear database after each test to ensure test isolation
        await userRepository.delete({});
    });

    afterAll(async () => {
        // Close TypeORM connection
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        // Disconnect Redis
        if (redisClient.isReady) {
            await redisClient.disconnect();
        }
    });

    const registerEndpoint = `${API_PREFIX}/auth/register`;
    const loginEndpoint = `${API_PREFIX}/auth/login`;

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully and return a token', async () => {
            const newUser = {
                username: 'integrationtestuser',
                email: 'test@integration.com',
                password: 'Password@123',
                role: UserRole.USER,
            };

            const res = await request(app).post(registerEndpoint).send(newUser);

            expect(res.statusCode).toEqual(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.user).toHaveProperty('id');
            expect(res.body.data.user.email).toBe(newUser.email);
            expect(res.body).toHaveProperty('token');

            // Verify user exists in DB and password is hashed
            const userInDb = await userRepository.findOneBy({ email: newUser.email });
            expect(userInDb).toBeDefined();
            expect(userInDb?.username).toBe(newUser.username);
            expect(await bcrypt.compare(newUser.password, userInDb!.password)).toBe(true);
        });

        it('should return 409 if user with email already exists', async () => {
            const existingUser = {
                username: 'existinguser',
                email: 'existing@integration.com',
                password: 'Password@123',
            };
            await request(app).post(registerEndpoint).send(existingUser); // Register once

            const res = await request(app).post(registerEndpoint).send(existingUser); // Try to register again

            expect(res.statusCode).toEqual(409);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('User with this email already exists.');
        });

        it('should return 400 for invalid input (e.g., weak password)', async () => {
            const invalidUser = {
                username: 'badpass',
                email: 'bad@integration.com',
                password: 'pass', // Too short, no special chars
            };

            const res = await request(app).post(registerEndpoint).send(invalidUser);

            expect(res.statusCode).toEqual(400);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toContain('Password must be at least 8 characters long');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        const testUser = {
            username: 'logintestuser',
            email: 'login@integration.com',
            password: 'LoginPassword@123',
            role: UserRole.USER,
        };
        let registeredUser: User;

        beforeEach(async () => {
            // Register a user before login tests
            const hashedPassword = await bcrypt.hash(testUser.password, 12);
            registeredUser = userRepository.create({
                ...testUser,
                password: hashedPassword,
            });
            await userRepository.save(registeredUser);
        });

        it('should log in an existing user successfully and return a token', async () => {
            const res = await request(app).post(loginEndpoint).send({
                email: testUser.email,
                password: testUser.password,
            });

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.user.email).toBe(testUser.email);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 401 for incorrect password', async () => {
            const res = await request(app).post(loginEndpoint).send({
                email: testUser.email,
                password: 'WrongPassword@123',
            });

            expect(res.statusCode).toEqual(401);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Incorrect email or password.');
        });

        it('should return 401 for non-existent email', async () => {
            const res = await request(app).post(loginEndpoint).send({
                email: 'nonexistent@integration.com',
                password: 'AnyPassword@123',
            });

            expect(res.statusCode).toEqual(401);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Incorrect email or password.');
        });
    });
});
```
```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/data-source';
import { User } from '../../src/database/entities/User';
import { hashPassword } from '../../src/utils/passwordUtils';

describe('Auth API Integration Tests', () => {
    let userRepository: any;

    beforeAll(async () => {
        userRepository = AppDataSource.getRepository(User);
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'integrationtestuser',
                email: 'integration@example.com',
                password: 'password123',
            };

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User registered successfully.');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.email).toBe(userData.email);
            expect(res.body.token).toBeDefined();

            const userInDb = await userRepository.findOneBy({ email: userData.email });
            expect(userInDb).toBeDefined();
            expect(userInDb!.username).toBe(userData.username);
        });

        it('should return 400 if email already exists', async () => {
            const userData = {
                username: 'existinguser',
                email: 'existing@example.com',
                password: 'password123',
            };
            await userRepository.save(userRepository.create({ ...userData, password: await hashPassword(userData.password) }));

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('User with this email already exists.');
        });

        it('should return 400 for invalid input (e.g., short password)', async () => {
            const userData = {
                username: 'invaliduser',
                email: 'invalid@example.com',
                password: '123', // Too short
            };

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(userData);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed.');
            expect(res.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'String must contain at least 6 character(s)' })])
            );
        });
    });

    describe('POST /api/v1/auth/login', () => {
        let testUser: User;
        let testPassword = 'loginpassword123';

        beforeEach(async () => {
            testUser = userRepository.create({
                username: 'logintestuser',
                email: 'login@example.com',
                password: await hashPassword(testPassword),
            });
            await userRepository.save(testUser);
        });

        it('should log in an existing user successfully', async () => {
            const credentials = {
                email: testUser.email,
                password: testPassword,
            };

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Logged in successfully.');
            expect(res.body.user).toHaveProperty('id', testUser.id);
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.token).toBeDefined();
        });

        it('should return 401 for invalid password', async () => {
            const credentials = {
                email: testUser.email,
                password: 'wrongpassword',
            };

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials.');
        });

        it('should return 401 for non-existent email', async () => {
            const credentials = {
                email: 'nonexistent@example.com',
                password: testPassword,
            };

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials.');
        });
    });
});
```
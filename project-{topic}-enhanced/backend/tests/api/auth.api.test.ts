```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User, UserRole } from '../../src/database/entities/user.entity';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config';

describe('Auth API E2E Tests', () => {
    let testUser: User;

    beforeAll(async () => {
        // Initialize the database for testing
        await AppDataSource.initialize();
        // Clear users table before tests
        await AppDataSource.getRepository(User).delete({});
    });

    afterEach(async () => {
        // Clean up after each test if necessary, or just clear all once
    });

    afterAll(async () => {
        // Clear users table after all tests
        await AppDataSource.getRepository(User).delete({});
        await AppDataSource.destroy();
    });

    // --- POST /api/auth/register ---
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'Password123!',
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User registered successfully');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user).toHaveProperty('username', 'newuser');
            expect(res.body.user).toHaveProperty('email', 'newuser@example.com');
            expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
            expect(res.body.user).toHaveProperty('role', UserRole.USER);

            // Verify user exists in DB
            const userInDb = await AppDataSource.getRepository(User).findOne({ where: { email: 'newuser@example.com' } });
            expect(userInDb).toBeDefined();
            expect(userInDb?.username).toBe('newuser');
            const isPasswordCorrect = await bcrypt.compare('Password123!', userInDb!.password);
            expect(isPasswordCorrect).toBe(true);

            testUser = userInDb!; // Store for later tests
        });

        it('should return 400 if username or email already exists', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newuser', // Already exists
                    email: 'another@example.com',
                    password: 'Password123!',
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'User with this email or username already exists.');
        });

        it('should return 400 for invalid input (e.g., missing password)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'invaliduser',
                    email: 'invalid@example.com',
                    // password missing
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message');
            expect(res.body.errors).toBeInstanceOf(Array);
        });
    });

    // --- POST /api/auth/login ---
    describe('POST /api/auth/login', () => {
        it('should log in an existing user and return tokens', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'Password123!',
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Login successful');
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');

            const decodedAccess = jwt.verify(res.body.accessToken, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
            expect(decodedAccess).toHaveProperty('userId', testUser.id);
            expect(decodedAccess).toHaveProperty('role', testUser.role);

            const decodedRefresh = jwt.verify(res.body.refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
            expect(decodedRefresh).toHaveProperty('userId', testUser.id);
            expect(decodedRefresh).toHaveProperty('role', testUser.role);

            // Verify refresh token is stored in DB
            const userInDb = await AppDataSource.getRepository(User).findOne({ where: { id: testUser.id }, select: ['refreshToken'] });
            expect(userInDb?.refreshToken).toBe(res.body.refreshToken);
        });

        it('should return 401 for invalid credentials (wrong password)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword!',
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });

        it('should return 401 for non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });

        it('should return 400 for invalid input (e.g., missing email)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    // email missing
                    password: 'Password123!',
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message');
            expect(res.body.errors).toBeInstanceOf(Array);
        });
    });

    // --- POST /api/auth/refresh-token ---
    describe('POST /api/auth/refresh-token', () => {
        let refreshToken: string;

        beforeAll(async () => {
            // Log in a user to get a valid refresh token
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'Password123!' });
            refreshToken = loginRes.body.refreshToken;
        });

        it('should refresh access token with a valid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(typeof res.body.accessToken).toBe('string');

            // Verify new access token is valid
            const decodedAccess = jwt.verify(res.body.accessToken, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
            expect(decodedAccess).toHaveProperty('userId', testUser.id);
            expect(decodedAccess).toHaveProperty('role', testUser.role);
        });

        it('should return 401 for an invalid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken: 'invalid.token.123' });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid or expired refresh token');
        });

        it('should return 401 if refresh token is not stored for the user (e.g., after logout)', async () => {
            // Simulate clearing refresh token from DB for testUser
            await AppDataSource.getRepository(User).update(testUser.id, { refreshToken: null });

            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken }); // Still using the token, but it's not in DB

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid or expired refresh token');

            // Restore for subsequent tests if any
            await AppDataSource.getRepository(User).update(testUser.id, { refreshToken });
        });
    });
});
```
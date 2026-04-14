```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const db = require('../../src/db');
const User = require('../../src/models/user.model');
const config = require('../../src/config');

describe('Auth API Tests', () => {
    beforeAll(async () => {
        await db.migrate.latest();
    });

    beforeEach(async () => {
        await db('job_logs').del();
        await db('scraped_data').del();
        await db('scraping_jobs').del();
        await db('users').del();
        await db.seed.run(); // Seed initial admin user
    });

    afterAll(async () => {
        await db.migrate.rollback();
        await db.destroy();
    });

    describe('POST /api/auth/register', () => {
        test('should return 201 and user info + token if registration is successful', async () => {
            const newUser = {
                username: 'registeruser',
                email: 'register@example.com',
                password: 'password123',
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(newUser)
                .expect(httpStatus.CREATED);

            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.username).toBe(newUser.username);
            expect(res.body.data.user.email).toBe(newUser.email);
            expect(res.body.data.user.role).toBe('user');
            expect(res.body.data.token).toBeDefined();

            const userInDb = await User.findByEmail(newUser.email);
            expect(userInDb).toBeDefined();
        });

        test('should return 409 if email is already taken', async () => {
            const existingUser = {
                username: 'existing',
                email: config.adminEmail,
                password: 'password123',
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(existingUser)
                .expect(httpStatus.CONFLICT);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email already taken');
        });

        test('should return 400 if required fields are missing', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com' }) // Missing username, password
                .expect(httpStatus.BAD_REQUEST);

            await request(app)
                .post('/api/auth/register')
                .send({ username: 'testuser', password: 'password123' }) // Missing email
                .expect(httpStatus.BAD_REQUEST);
        });
    });

    describe('POST /api/auth/login', () => {
        test('should return 200 and user info + token if login is successful', async () => {
            const loginCredentials = {
                email: config.adminEmail,
                password: config.adminPassword,
            };

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginCredentials)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.email).toBe(loginCredentials.email);
            expect(res.body.data.user.role).toBe('admin');
            expect(res.body.data.token).toBeDefined();
        });

        test('should return 401 if email is not found', async () => {
            const loginCredentials = {
                email: 'nonexistent@example.com',
                password: 'password123',
            };

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginCredentials)
                .expect(httpStatus.UNAUTHORIZED);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Incorrect email or password');
        });

        test('should return 401 if password is incorrect', async () => {
            const loginCredentials = {
                email: config.adminEmail,
                password: 'wrongpassword',
            };

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginCredentials)
                .expect(httpStatus.UNAUTHORIZED);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Incorrect email or password');
        });

        test('should return 400 if required fields are missing', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({ email: config.adminEmail }) // Missing password
                .expect(httpStatus.BAD_REQUEST);

            await request(app)
                .post('/api/auth/login')
                .send({ password: config.adminPassword }) // Missing email
                .expect(httpStatus.BAD_REQUEST);
        });
    });
});
```
```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { sequelize } = require('../../src/database');
const { User, Token } = require('../../src/models');
const { faker } = require('@faker-js/faker');
const { tokenTypes } = require('../../src/config/tokens');
const config = require('../../src/config/config');
const jwt = require('jsonwebtoken');

// ALX Principle: Integration Testing
// Test the interaction between multiple components (routes, controllers, services, models, database).

describe('Auth routes', () => {
    // Before each test, clear and reset the database
    beforeEach(async () => {
        await sequelize.sync({ force: true }); // Clear and re-create tables
        // Seed an admin user for testing internal auth
        const adminPassword = 'AdminPassword123!';
        const hashedPassword = await User.prototype.isPasswordMatch.call({ password: adminPassword }, adminPassword) ? adminPassword : User.build({ password: adminPassword }).password;
        await User.create({
            id: faker.string.uuid(),
            name: 'Test Admin',
            email: 'testadmin@example.com',
            password: adminPassword, // Will be hashed by model hook
            role: 'admin',
            isEmailVerified: true,
        });
    });

    // After all tests, close the database connection
    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /api/v1/auth/register', () => {
        let newUser;

        beforeEach(() => {
            newUser = {
                name: faker.person.fullName(),
                email: faker.internet.email(),
                password: 'Password123!',
            };
        });

        test('should return 201 and user/tokens if registration is successful', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(httpStatus.CREATED);

            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('tokens');
            expect(res.body.user.email).toBe(newUser.email);
            expect(res.body.user).not.toHaveProperty('password'); // Password should be private
            expect(res.body.tokens).toHaveProperty('access');
            expect(res.body.tokens).toHaveProperty('refresh');

            const dbUser = await User.findOne({ where: { email: newUser.email } });
            expect(dbUser).toBeDefined();
            expect(await dbUser.isPasswordMatch(newUser.password)).toBe(true); // Password should be hashed
            expect(dbUser.role).toBe('user'); // Default role

            const dbRefreshToken = await Token.findOne({ where: { userId: dbUser.id, type: tokenTypes.REFRESH } });
            expect(dbRefreshToken).toBeDefined();
        });

        test('should return 400 error if email is already taken', async () => {
            await request(app).post('/api/v1/auth/register').send(newUser).expect(httpStatus.CREATED);

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(newUser) // Use same email
                .expect(httpStatus.BAD_REQUEST);

            expect(res.body.code).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.message).toBe('Email already taken');
        });

        test('should return 400 error if password does not meet criteria', async () => {
            newUser.password = 'short'; // Too short
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send(newUser)
                .expect(httpStatus.BAD_REQUEST);

            expect(res.body.code).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.message).toMatch(/password must be at least 8 characters/);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        const password = 'TestPassword123!';
        let user;

        beforeEach(async () => {
            user = await User.create({
                id: faker.string.uuid(),
                name: faker.person.fullName(),
                email: faker.internet.email(),
                password: password, // Will be hashed by model hook
                role: 'user',
            });
        });

        test('should return 200 and tokens if login is successful', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: user.email, password: password })
                .expect(httpStatus.OK);

            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('tokens');
            expect(res.body.user.email).toBe(user.email);
            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.tokens).toHaveProperty('access');
            expect(res.body.tokens).toHaveProperty('refresh');

            const dbRefreshToken = await Token.findOne({ where: { userId: user.id, type: tokenTypes.REFRESH } });
            expect(dbRefreshToken).toBeDefined();
        });

        test('should return 401 error if email is wrong', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'wrong@example.com', password: password })
                .expect(httpStatus.UNAUTHORIZED);

            expect(res.body.code).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.message).toBe('Incorrect email or password');
        });

        test('should return 401 error if password is wrong', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: user.email, password: 'wrongpassword' })
                .expect(httpStatus.UNAUTHORIZED);

            expect(res.body.code).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.message).toBe('Incorrect email or password');
        });
    });

    // Example of testing a protected route with an invalid token
    describe('GET /api/v1/users (protected route)', () => {
        test('should return 401 if access token is missing', async () => {
            await request(app)
                .get('/api/v1/users')
                .send()
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 401 if access token is invalid', async () => {
            const invalidToken = jwt.sign({ sub: faker.string.uuid(), type: tokenTypes.ACCESS }, 'wrong_secret');

            await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${invalidToken}`)
                .send()
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 403 if user is not admin (for /users route)', async () => {
            const userPassword = 'UserPassword123!';
            const user = await User.create({
                id: faker.string.uuid(),
                name: faker.person.fullName(),
                email: faker.internet.email(),
                password: userPassword,
                role: 'user', // Non-admin user
            });
            const { body: loginRes } = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: user.email, password: userPassword })
                .expect(httpStatus.OK);

            await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${loginRes.tokens.access.token}`)
                .send()
                .expect(httpStatus.FORBIDDEN); // User role cannot access manageUsers
        });
    });
});
```
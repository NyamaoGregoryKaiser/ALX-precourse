```javascript
const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Cart } = require('../../src/config/db');
const bcrypt = require('bcryptjs');

describe('Auth Integration Tests', () => {
    let testUser;
    const testPassword = 'password123';

    // Before all tests, connect to DB and create a test user
    beforeAll(async () => {
        // Ensure we are in a test environment and connected to the test DB
        if (sequelize.options.database !== 'ecommerce_test_db') {
            throw new Error('Integration tests must run against ecommerce_test_db!');
        }
        await sequelize.sync({ force: true }); // Clear and re-create tables
        await User.create({
            username: 'existinguser',
            email: 'existing@example.com',
            password: testPassword // Password will be hashed by model hook
        });
    });

    // After all tests, close DB connection
    afterAll(async () => {
        await sequelize.close();
    });

    // After each test, clean up users (except the existing one for specific tests)
    afterEach(async () => {
        // Optionally clean up more thoroughly if needed, e.g., delete all new users
    });

    // --- Register Route Tests ---
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.user).toHaveProperty('id');
            expect(res.body.data.user.email).toBe('newuser@example.com');
            expect(res.body.data.token).toBeDefined();

            // Verify user and cart are created in DB
            const userInDb = await User.findOne({ where: { email: 'newuser@example.com' } });
            expect(userInDb).not.toBeNull();
            expect(await userInDb.comparePassword('password123')).toBe(true);

            const cartInDb = await Cart.findOne({ where: { userId: userInDb.id } });
            expect(cartInDb).not.toBeNull();
        });

        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'incomplete',
                    email: 'incomplete@example.com'
                }); // Missing password

            expect(res.statusCode).toEqual(400);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Please enter all required fields: username, email, password.');
        });

        it('should return 400 if email already exists', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'existingagain',
                    email: 'existing@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('User with that email already exists');
        });
    });

    // --- Login Route Tests ---
    describe('POST /api/v1/auth/login', () => {
        it('should log in existing user successfully', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'existing@example.com',
                    password: testPassword
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.user.email).toBe('existing@example.com');
            expect(res.body.data.token).toBeDefined();
            testUser = res.body.data.user; // Store for other tests if needed
        });

        it('should return 401 for invalid credentials (wrong password)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'existing@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return 401 for invalid credentials (user not found)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return 400 if email or password are missing', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'missingpassword@example.com' }); // Missing password

            expect(res.statusCode).toEqual(400);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Please enter email and password.');
        });
    });
});
```
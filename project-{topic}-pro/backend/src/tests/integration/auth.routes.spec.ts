```typescript
import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../database/data-source';
import { User } from '../../database/entities/User';
import * as bcrypt from 'bcryptjs';
import * as jwt from '../../utils/jwt';

describe('Auth Routes (Integration)', () => {
    let testUser: User;
    let testToken: string;
    let userRepository = AppDataSource.getRepository(User);

    beforeAll(async () => {
        // Ensure database is initialized before tests run
        await AppDataSource.initialize();

        // Clean up users table
        await userRepository.delete({});

        // Create a test user directly in the DB
        const hashedPassword = await bcrypt.hash('testpassword', 10);
        testUser = userRepository.create({
            email: 'integration@test.com',
            password: hashedPassword,
            role: 'user'
        });
        await userRepository.save(testUser);

        // Generate a token for this user
        testToken = jwt.generateToken(testUser);
    });

    afterAll(async () => {
        await userRepository.delete({});
        await AppDataSource.destroy();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'register@test.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toEqual('User registered successfully');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.email).toEqual('register@test.com');

            // Clean up created user
            await userRepository.delete({ email: 'register@test.com' });
        });

        it('should return 400 if email is missing', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(400); // Bad request from schema validation / controller logic
            expect(res.body.message).toBeDefined();
        });

        it('should return 409 if user already exists', async () => {
            // Create user first
            const hashedPassword = await bcrypt.hash('temp_password', 10);
            await userRepository.save(userRepository.create({
                email: 'duplicate@test.com',
                password: hashedPassword,
                role: 'user'
            }));

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'duplicate@test.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(409); // Conflict
            expect(res.body.message).toEqual('User with this email already exists.');

            // Clean up
            await userRepository.delete({ email: 'duplicate@test.com' });
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login a user successfully and return a token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'testpassword'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toEqual('Login successful');
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toEqual(testUser.email);
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'wrong@test.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body.message).toEqual('Invalid credentials.');
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('should return the authenticated user\'s details', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${testToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.user).toHaveProperty('id', testUser.id);
            expect(res.body.user).toHaveProperty('email', testUser.email);
            expect(res.body.user).toHaveProperty('role', testUser.role);
            expect(res.body.user).not.toHaveProperty('password'); // Ensure password is not exposed
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me');

            expect(res.statusCode).toEqual(401);
            expect(res.body.message).toEqual('Not authorized, no token provided');
        });

        it('should return 401 for an invalid token', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalidtoken');

            expect(res.statusCode).toEqual(401);
            expect(res.body.message).toEqual('Not authorized, token is invalid');
        });
    });
});
```
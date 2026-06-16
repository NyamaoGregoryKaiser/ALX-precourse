import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../database/data-source';
import { User } from '../../entities/User';
import { hashPassword } from '../../utils/hash';

describe('Auth API E2E Tests', () => {
    beforeEach(async () => {
        // Clear all data before each test
        const entities = AppDataSource.entityMetadatas;
        for (const entity of entities) {
            const repository = AppDataSource.getRepository(entity.name);
            await repository.clear();
        }
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'apitestuser',
                    email: 'apitest@example.com',
                    password: 'password123',
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.email).toBe('apitest@example.com');
            expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned

            const user = await AppDataSource.getRepository(User).findOneBy({ email: 'apitest@example.com' });
            expect(user).toBeDefined();
            expect(user?.username).toBe('apitestuser');
        });

        it('should return 400 if email already exists', async () => {
            const hashedPassword = await hashPassword('password123');
            await AppDataSource.getRepository(User).save({
                username: 'existing',
                email: 'apitest@example.com',
                password: hashedPassword,
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'anotheruser',
                    email: 'apitest@example.com',
                    password: 'password456',
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toContain('Email already exists');
        });

        it('should return 400 for invalid input (e.g., missing email)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'invaliduser',
                    password: 'password123',
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toContain('"email" is required');
        });
    });

    describe('POST /api/auth/login', () => {
        let testUser: User;
        const userCreds = {
            email: 'login@example.com',
            password: 'loginpassword',
        };

        beforeEach(async () => {
            const hashedPassword = await hashPassword(userCreds.password);
            testUser = AppDataSource.getRepository(User).create({
                username: 'loginuser',
                email: userCreds.email,
                password: hashedPassword,
            });
            await AppDataSource.getRepository(User).save(testUser);
        });

        it('should log in an existing user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send(userCreds);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(userCreds.email);
            expect(res.body.user).not.toHaveProperty('password');
        });

        it('should return 400 for incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userCreds.email,
                    password: 'wrongpassword',
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should return 400 for non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'anypassword',
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toBe('Invalid credentials');
        });
    });
});
```

**Performance Tests**
Performance tests are usually run using dedicated tools. The `package.json` includes a script using `loadtest`:
`npm run test:performance`

This will hit `http://localhost:5000/api/projects` 1000 times with 100 concurrent clients, limiting to 50 requests per second. For authenticated endpoints, you'd need to provide a token (e.g., via headers or cookies, which `loadtest` supports).

Example `loadtest` command for an authenticated endpoint:
`loadtest -n 1000 -c 50 --rps 50 -H "Authorization: Bearer YOUR_VALID_JWT_TOKEN" http://localhost:5000/api/projects`

---

### 5. Documentation

**`README.md`**
```markdown
```typescript
import 'reflect-metadata';
import request from 'supertest';
import { AppDataSource } from '../../ormconfig';
import app from '../../app';
import { User, UserRole } from '@models/User';
import { hashPassword } from '@utils/password';
import { generateAccessToken } from '@utils/jwt';

// Silence logger for API tests
jest.mock('@config/logger');

describe('Auth API Tests', () => {
  let adminAccessToken: string;
  let adminUser: User;

  beforeAll(async () => {
    // Ensure DB is clean before tests start
    await AppDataSource.getRepository(Task).delete({});
    await AppDataSource.getRepository(Project).delete({});
    await AppDataSource.getRepository(User).delete({});

    const hashedPassword = await hashPassword('AdminPass123!');
    adminUser = AppDataSource.getRepository(User).create({
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await AppDataSource.getRepository(User).save(adminUser);
    adminAccessToken = generateAccessToken({ id: adminUser.id, role: adminUser.role });
  });

  afterAll(async () => {
    // Clean up DB after all tests
    await AppDataSource.getRepository(Task).delete({});
    await AppDataSource.getRepository(Project).delete({});
    await AppDataSource.getRepository(User).delete({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'Password123!',
          role: UserRole.USER,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('newuser@test.com');
      expect(res.body.user.role).toBe(UserRole.USER);
    });

    it('should return 409 if email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'admin@test.com', // Already exists
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toContain('User with that email or username already exists.');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'short',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Validation error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in an existing user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPass123!',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('admin@test.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'WrongPassword!',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });
});
```
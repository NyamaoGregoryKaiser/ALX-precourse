```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { AppDataSource } from '../../src/dataSource';
import { User, UserRole } from '../../src/entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

describe('Auth API Integration Tests', () => {
  let testUser: User;
  let hashedPassword = '';

  beforeAll(async () => {
    // Ensure DB is connected and clean via setup.ts
    // Hash password once for test user
    hashedPassword = await bcrypt.hash('testpassword', 10);
  });

  beforeEach(async () => {
    // Clear users table specifically for auth tests
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.query(`TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;`);

    // Create a user for login tests
    testUser = userRepository.create({
      username: 'apiuser',
      email: 'api@example.com',
      password: hashedPassword,
      role: UserRole.USER,
    });
    await userRepository.save(testUser);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'new@example.com', password: 'securepassword' })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', 'new@example.com');
      expect(response.body.data).not.toHaveProperty('password'); // Password should not be returned
      expect(response.body.data).toHaveProperty('role', UserRole.USER);

      const registeredUser = await AppDataSource.getRepository(User).findOne({ where: { email: 'new@example.com' } });
      expect(registeredUser).not.toBeNull();
      expect(await bcrypt.compare('securepassword', registeredUser!.password)).toBe(true);
    });

    it('should return 409 if email already exists', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'existing', email: 'api@example.com', password: 'password' })
        .expect(409);
    });

    it('should return 400 for invalid input (e.g., missing email)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'invalid', password: 'password' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in a user and return tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'testpassword' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return the authenticated user\'s profile', async () => {
      const accessToken = jwt.sign({ id: testUser.id, role: testUser.role }, env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 401 if token is invalid', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer invalidtoken`)
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh the access token with a valid refresh token', async () => {
      const refreshToken = jwt.sign({ id: testUser.id }, env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken'); // New refresh token
    });

    it('should return 401 for an expired refresh token', async () => {
      // Create an expired refresh token
      const expiredRefreshToken = jwt.sign({ id: testUser.id }, env.REFRESH_TOKEN_SECRET, { expiresIn: '1s' });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for it to expire

      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);
    });

    it('should return 401 for an invalid refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });
});
```
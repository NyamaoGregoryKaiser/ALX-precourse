import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User } from '../../src/modules/auth/entities/User';
import bcrypt from 'bcryptjs';

describe('Auth API E2E Tests', () => {
  const testUser = {
    username: 'testuser_api',
    email: 'test_api@example.com',
    password: 'securepassword123',
  };

  beforeEach(async () => {
    // Clear users table specifically for auth tests
    await AppDataSource.getRepository(User).clear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.username).toBe(testUser.username);
      expect(res.body.data.email).toBe(testUser.email);

      const userInDb = await AppDataSource.getRepository(User).findOne({ where: { username: testUser.username } });
      expect(userInDb).toBeDefined();
      expect(await bcrypt.compare(testUser.password, userInDb!.password)).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'incomplete' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('email');
      expect(res.body.message).toContain('password');
    });

    it('should return 409 if username or email already exists', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409); // Conflict

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user first for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('should login a user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: testUser.username, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: testUser.username, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'anypassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });
});
```
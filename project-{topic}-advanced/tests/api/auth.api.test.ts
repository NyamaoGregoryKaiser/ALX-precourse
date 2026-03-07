```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSourceInstance } from '../../src/database';
import { User } from '../../src/database/entities/User';

describe('Auth API', () => {
  let server: any; // Represents the Express server
  let testUser: User;

  beforeAll(async () => {
    server = app.listen(0); // Start the app on an ephemeral port
    // Database setup handled by jest.setup.ts
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    // Database teardown handled by jest.setup.ts
  });

  beforeEach(async () => {
    // Clear user data before each test
    await AppDataSourceInstance.getRepository(User).delete({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should return 409 if email already registered', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'Password123!' });

      const res = await request(server)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'AnotherPassword!' });

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('User with this email already exists.');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'short' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Email must be a valid email address');
      expect(res.body.message).toContain('Password must be at least 8 characters long');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(server)
        .post('/api/auth/register')
        .send({ email: 'loginuser@example.com', password: 'LoginPass123!' });
    });

    it('should log in a user and return a token', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'LoginPass123!',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('loginuser@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'loginuser@example.com', password: 'WrongPassword!' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // Register and log in a user to get a token
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({ email: 'meuser@example.com', password: 'MePass123!' });
      token = registerRes.body.data.token;
    });

    it('should return the authenticated user\'s profile', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('meuser@example.com');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(server)
        .get('/api/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Authentication token missing.');
    });

    it('should return 403 if token is invalid', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer invalidtoken`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Invalid or expired token.');
    });
  });
});
```
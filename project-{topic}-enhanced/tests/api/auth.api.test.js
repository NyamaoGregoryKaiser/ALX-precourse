```javascript
const request = require('supertest');
const app = require('../../app');
const { sequelize, User } = require('../../db/models');
const cache = require('../../utils/cache');
const bcrypt = require('bcryptjs');

describe('Auth API Tests', () => {
  let adminUser, testUser;
  let adminAccessToken, adminRefreshToken;
  let testAccessToken, testRefreshToken;

  beforeAll(async () => {
    // Re-run migrations and clear cache for a clean state
    await sequelize.sync({ force: true });
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await cache.client.flushdb();

    // Create a base admin user
    adminUser = await User.create({
      username: 'apiadmin',
      email: 'apiadmin@example.com',
      password: 'adminpassword',
      role: 'admin',
    });

    // Create a base test user
    testUser = await User.create({
      username: 'apitestuser',
      email: 'apitestuser@example.com',
      password: 'userpassword',
      role: 'user',
    });
  });

  afterAll(async () => {
    // Database connection closure handled by tests/setup.test.js
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'registerapi',
          email: 'registerapi@example.com',
          password: 'securepassword',
          role: 'user',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe('registerapi@example.com');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
    });

    it('should return 409 if email already exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'adminagain',
          email: 'apiadmin@example.com', // Existing email
          password: 'password123',
          role: 'user',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User with that email already exists');
    });

    it('should return 400 for invalid input (e.g., short password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'shortpass',
          email: 'shortpass@example.com',
          password: 'short', // Too short
          role: 'user',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Password must be at least 8 characters long/);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in admin user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'apiadmin@example.com',
          password: 'adminpassword',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('apiadmin@example.com');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
      adminAccessToken = res.body.tokens.accessToken;
      adminRefreshToken = res.body.tokens.refreshToken;
    });

    it('should log in test user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'apitestuser@example.com',
          password: 'userpassword',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('apitestuser@example.com');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
      testAccessToken = res.body.tokens.accessToken;
      testRefreshToken = res.body.tokens.refreshToken;
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'apiadmin@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 400 for invalid input (e.g., missing password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'apiadmin@example.com',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/password is required/);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh access token using a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: adminRefreshToken });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
      expect(res.body.tokens.accessToken).not.toBe(adminAccessToken); // New access token
      expect(res.body.tokens.refreshToken).not.toBe(adminRefreshToken); // Rotated refresh token

      adminAccessToken = res.body.tokens.accessToken; // Update for subsequent tests
      adminRefreshToken = res.body.tokens.refreshToken;
    });

    it('should return 401 for an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Unable to refresh access token/);
    });

    it('should return 401 for a revoked refresh token', async () => {
      // First, log in a new user to get a fresh refresh token
      const newUserRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'tempuser',
          email: 'temp@example.com',
          password: 'password123',
          role: 'user',
        });
      const tempRefreshToken = newUserRes.body.tokens.refreshToken;
      const tempUserId = newUserRes.body.data.user.id;

      // Manually revoke it from Redis (simulating logout or rotation during login)
      await cache.client.del(`refreshToken:${tempUserId}:${tempRefreshToken}`);

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: tempRefreshToken });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid or expired refresh token. Please log in again.');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should log out a user and invalidate their refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ refreshToken: testRefreshToken });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Logged out successfully');

      // Verify token is invalidated in cache
      const cachedToken = await cache.client.get(`refreshToken:${testUser.id}:${testRefreshToken}`);
      expect(cachedToken).toBeNull();
    });

    it('should return 401 if access token is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: adminRefreshToken }); // Valid refresh, but no access token

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
    });

    it('should return 404 if refresh token is already invalid/non-existent', async () => {
      // Use the already logged-out testRefreshToken
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminAccessToken}`) // Use any valid access token for auth middleware
        .send({ refreshToken: testRefreshToken });

      expect(res.statusCode).toEqual(404); // Should be 404 from service layer
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Refresh token not found or already invalidated.');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return profile of authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe(adminUser.email);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 if no access token provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
    });

    it('should return 401 if access token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer invalid.jwt.token`);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid access token');
    });
  });
});
```
```javascript
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../../src/config');
const bcrypt = require('bcryptjs');

let mongoServer;

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({}); // Clear users before each test
    // Create a base user for login tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'developer',
    });
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'newpassword123',
          role: 'developer'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('new@example.com');
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.role).toBe('developer');

      const user = await User.findOne({ email: 'new@example.com' });
      expect(user).toBeDefined();
      expect(user.username).toBe('newuser');
    });

    test('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'incomplete',
          email: 'incomplete@example.com' // Missing password
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password is required');
    });

    test('should return 400 if email is already registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'anotheruser',
          email: 'test@example.com', // Existing email
          password: 'anotherpassword'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Duplicate field value: \'email\' already exists');
    });

    test('should return 400 if username is already registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser', // Existing username
          email: 'unique@example.com',
          password: 'anotherpassword'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Duplicate field value: \'username\' already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login a user and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@example.com');
    });

    test('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    test('should return 401 for invalid credentials (user not found)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    test('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'password123'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email is required');
    });

    test('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password is required');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      token = res.body.token;
    });

    test('should return logged in user data if token is valid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.username).toBe('testuser');
      expect(res.body.data.password).toBeUndefined(); // Should not return password
    });

    test('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized to access this route');
    });

    test('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized, token failed');
    });

    test('should return 401 if token is expired', async () => {
      // Temporarily set a very short expiry for testing
      const originalJwtExpiresIn = config.jwtExpiresIn;
      config.jwtExpiresIn = '1ms'; // 1 millisecond
      const shortLivedTokenUser = await User.create({ username: 'shortlive', email: 'short@live.com', password: await bcrypt.hash('password', 10), role: 'developer' });
      const shortLivedToken = shortLivedTokenUser.getSignedJwtToken();
      config.jwtExpiresIn = originalJwtExpiresIn; // Reset immediately

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized, token failed');
    });
  });
});
```
const request = require('supertest');
const app = require('../../src/app');
const sequelize = require('../../src/config/database');
const User = require('../../src/models/User')(sequelize, require('sequelize'));
const authService = require('../../src/services/authService');

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await User.destroy({ truncate: true, cascade: true });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User registered successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toEqual(newUser.email);
      expect(res.body.user.role).toEqual('user'); // Default role
    });

    it('should return 409 if email already exists', async () => {
      await authService.registerUser('existing', 'existing@example.com', 'password123');

      const newUser = {
        username: 'another',
        email: 'existing@example.com',
        password: 'password456',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual('Email already in use');
    });

    it('should return 400 for invalid input', async () => {
      const invalidUser = {
        username: 'tu', // Too short
        email: 'invalid-email',
        password: '123', // Too short
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let user;
    beforeEach(async () => {
      user = await authService.registerUser('loginuser', 'login@example.com', 'password123');
    });

    it('should log in a user successfully and return a token', async () => {
      const credentials = {
        email: 'login@example.com',
        password: 'password123',
      };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Login successful');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toEqual(credentials.email);
    });

    it('should return 401 for incorrect password', async () => {
      const credentials = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials');
    });

    it('should return 401 for non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials');
    });

    it('should return 400 for invalid input', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: '123',
      };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidCredentials);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
      expect(res.body.errors).toBeInstanceOf(Array);
    });
  });
});
```
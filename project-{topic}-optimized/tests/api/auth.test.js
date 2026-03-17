const request = require('supertest');
const app = require('../../src/app'); // Import your Express app
const knex = require('knex');
const knexConfig = require('../../knexfile');
const config = require('../../src/config');
const bcrypt = require('bcryptjs');

// Initialize Knex for the test environment
const db = knex(knexConfig.test);

describe('Auth API Tests', () => {
  // We'll manage a specific test user for these tests
  const testUser = {
    username: 'apiuser',
    email: 'api.user@test.com',
    password: 'apiPassword123',
    role: 'user',
  };

  beforeAll(async () => {
    // Ensure the test user does not exist from previous runs
    await db('users').where({ email: testUser.email }).del();
  });

  // Clean up after each test to ensure isolation
  afterEach(async () => {
    await db('users').where({ email: testUser.email }).del();
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe(testUser.role);
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned

      // Verify user exists in database
      const userInDb = await db('users').where({ email: testUser.email }).first();
      expect(userInDb).toBeDefined();
      expect(await bcrypt.compare(testUser.password, userInDb.password)).toBe(true);
    });

    test('should return 409 if user with email already exists', async () => {
      // Register first
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      // Try to register again with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('User with this email already exists.');
    });

    test('should return 400 for invalid registration data', async () => {
      const invalidUser = {
        username: 'ab', // too short
        email: 'invalid-email',
        password: '123', // too short
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Validation error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let registeredUser;

    beforeEach(async () => {
      // Register a user first for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      registeredUser = await db('users').where({ email: testUser.email }).first();
    });

    test('should login a user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user).toHaveProperty('id', registeredUser.id);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
    });

    test('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    test('should return 401 for invalid credentials (non-existent email)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: testUser.password });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    test('should return 400 for invalid login data', async () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: '123',
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Validation error');
    });
  });
});
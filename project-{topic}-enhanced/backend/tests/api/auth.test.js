```javascript
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const { hashPassword } = require('../../src/utils/crypt');
const config = require('../../src/config');

// Use a separate test database
process.env.NODE_ENV = 'test';
process.env.DB_NAME = config.db.testName;

describe('Auth API Tests', () => {
  const testUser = {
    email: 'auth_test@example.com',
    password: 'Password123!',
    name: 'Auth Tester',
    type: 'user',
  };

  beforeAll(async () => {
    // Apply migrations
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Rollback migrations
    await db.migrate.rollback();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clear users table before each test to ensure a clean state
    await db('users').del();
    await db('merchants').del(); // Also clear merchants if they are created by auth process
  });

  // --- Registration Tests ---
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('token');

      // Verify user in database
      const userInDb = await db('users').where({ email: testUser.email }).first();
      expect(userInDb).not.toBeNull();
      expect(await hashPassword(testUser.password)).not.toBe(userInDb.password); // Should be hashed
    });

    it('should prevent registration with an existing email', async () => {
      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      // Attempt to register again with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(409); // Conflict
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('DUPLICATE_EMAIL');
    });

    it('should return 400 for invalid registration data', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email', password: '123' }; // Invalid email, short password
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('should register a new merchant user and create a merchant account', async () => {
      const merchantUserData = { ...testUser, email: 'merchant_reg@example.com', type: 'merchant' };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(merchantUserData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.type).toBe('merchant');

      // Verify merchant in database
      const merchantUserInDb = await db('users').where({ email: merchantUserData.email }).first();
      expect(merchantUserInDb).not.toBeNull();
      expect(merchantUserInDb.merchant_id).not.toBeNull();

      const merchantInDb = await db('merchants').where({ id: merchantUserInDb.merchant_id }).first();
      expect(merchantInDb).not.toBeNull();
      expect(merchantInDb.user_id).toBe(merchantUserInDb.id);
      expect(merchantInDb.name).toBe(`${merchantUserData.name}'s Merchant Account`);
    });
  });

  // --- Login Tests ---
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a user first for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should log in an existing user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('token');
      expect(res.headers['set-cookie']).toBeDefined(); // Assuming cookie is set
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: testUser.password });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 400 for invalid login data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: '' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  // --- Logout Tests ---
  describe('GET /api/v1/auth/logout', () => {
    let token;

    beforeEach(async () => {
      // Login a user to get a token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      token = loginRes.body.token;
    });

    it('should log out the user by clearing the JWT cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`); // Authorization header is ignored for logout logic but good practice

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Logged out successfully');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toMatch(/jwt=loggedout/);
      expect(res.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970 00:00:10 GMT/); // Should be immediately expired
    });
  });
});
```
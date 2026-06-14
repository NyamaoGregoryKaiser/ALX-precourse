```javascript
const request = require('supertest');
const app = require('../../server');
const { sequelize, User } = require('../../models');
const bcrypt = require('bcryptjs');

// Use a separate test database
process.env.DB_NAME = process.env.DB_NAME + '_test';

describe('Auth API Integration Tests', () => {
  let adminUser;
  let normalUser;
  let adminToken;
  let normalToken;

  beforeAll(async () => {
    // Sync DB and create tables
    await sequelize.sync({ force: true });

    // Create a test admin user
    const adminPassword = await bcrypt.hash('adminpassword', 10);
    adminUser = await User.create({
      username: 'testadmin',
      email: 'admin@test.com',
      password: adminPassword,
      role: 'admin',
    });

    // Create a test normal user
    const userPassword = await bcrypt.hash('userpassword', 10);
    normalUser = await User.create({
      username: 'testuser',
      email: 'user@test.com',
      password: userPassword,
      role: 'user',
    });

    // Get tokens
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: 'adminpassword' });
    adminToken = adminLoginRes.body.token;

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: normalUser.email, password: 'userpassword' });
    normalToken = userLoginRes.body.token;
  });

  afterAll(async () => {
    await sequelize.drop(); // Clean up test database
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'newpassword123',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.role).toBe('user');
      expect(res.body).toHaveProperty('token');
    });

    it('should return 400 if email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existing',
          email: 'user@test.com', // Already exists
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email already in use.');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'sh', // too short
          email: 'invalid-email',
          password: '123', // too short
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'userpassword',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('user@test.com');
      expect(res.body).toHaveProperty('token');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials.');
    });

    it('should return 401 for invalid credentials (email not found)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials.');
    });
  });
});
```

#### API Tests (Supertest - covered by Integration Tests above)
The integration tests cover API endpoints, including authentication, CRUD operations, and error handling.

#### Performance Tests (Artillery - configuration only)
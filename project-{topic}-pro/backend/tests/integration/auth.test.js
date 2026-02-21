const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User } = require('../../src/db/sequelize');
const bcrypt = require('bcryptjs');

describe('Auth API', () => {
  beforeAll(async () => {
    // Ensure test database is clean before running tests
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    // Clean up User table after each test
    await User.destroy({ truncate: true, cascade: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully with 201 status', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const res = await request(app).post('/api/auth/register').send(userData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(userData.username);
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.role).toBe('user');

      // Verify user in database
      const userInDb = await User.findOne({ where: { email: userData.email } });
      expect(userInDb).not.toBeNull();
      expect(userInDb.username).toBe(userData.username);
      expect(await bcrypt.compare(userData.password, userInDb.passwordHash)).toBe(true);
    });

    it('should return 400 if email already exists', async () => {
      const userData = {
        username: 'existinguser',
        email: 'exists@example.com',
        password: 'Password123!',
      };
      await User.create({
        username: userData.username,
        email: userData.email,
        passwordHash: await bcrypt.hash(userData.password, 10),
      });

      const res = await request(app).post('/api/auth/register').send(userData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('User with that email already exists.');
    });

    it('should return 400 for invalid input (e.g., weak password)', async () => {
      const userData = {
        username: 'invaliduser',
        email: 'invalid@example.com',
        password: 'short',
      };

      const res = await request(app).post('/api/auth/register').send(userData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Password must contain at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long.');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    const userPassword = 'Password123!';

    beforeEach(async () => {
      testUser = await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        passwordHash: userPassword, // Hashed by hook
      });
    });

    it('should log in an existing user successfully with 200 status', async () => {
      const credentials = {
        email: testUser.email,
        password: userPassword,
      };

      const res = await request(app).post('/api/auth/login').send(credentials);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should return 401 for incorrect password', async () => {
      const credentials = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      const res = await request(app).post('/api/auth/login').send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: userPassword,
      };

      const res = await request(app).post('/api/auth/login').send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 400 for missing email or password', async () => {
      const res1 = await request(app).post('/api/auth/login').send({ password: userPassword });
      expect(res1.statusCode).toEqual(400);
      expect(res1.body.message).toBe('Please provide email and password!');

      const res2 = await request(app).post('/api/auth/login').send({ email: testUser.email });
      expect(res2.statusCode).toEqual(400);
      expect(res2.body.message).toBe('Please provide email and password!');
    });
  });
});
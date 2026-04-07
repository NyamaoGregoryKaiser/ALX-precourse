const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../app');
const { sequelize, User } = require('../../db/models');
const { hashPassword } = require('../../utils/hash.utils');
const authService = require('../../services/auth.service');
const { getRedisClient } = require('../../config/redis.config');
const config = require('../../config/config');

describe('Auth Routes Integration Tests', () => {
  let adminUser;
  let regularUser;
  let adminTokens;
  let regularTokens;
  let redisClient;

  beforeAll(async () => {
    // Ensure the database is clean and seeded for a consistent test state
    // The global setupTests.js handles this once.
    // Fetch seeded users
    adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
    regularUser = await User.findOne({ where: { email: 'user@example.com' } });

    // Generate tokens for seeded users
    adminTokens = await authService.generateAuthTokens(adminUser);
    regularTokens = await authService.generateAuthTokens(regularUser);

    redisClient = getRedisClient();
  });

  afterEach(async () => {
    // Clean up refresh tokens from Redis for consistent testing if they were generated
    await redisClient.del(`refreshToken:${adminUser.id}:${adminTokens.refresh.token}`);
    await redisClient.del(`refreshToken:${regularUser.id}:${regularTokens.refresh.token}`);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully with default role', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'newpassword123',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe(newUser.name);
      expect(res.body.user.email).toBe(newUser.email);
      expect(res.body.user.role).toBe('user'); // Default role
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.access).toBeDefined();
      expect(res.body.tokens.refresh).toBeDefined();

      // Verify user exists in DB
      const userInDb = await User.findOne({ where: { email: newUser.email } });
      expect(userInDb).toBeDefined();
      expect(await userInDb.isPasswordMatch(newUser.password)).toBe(true);

      // Clean up the created user and its refresh token in Redis
      await userInDb.destroy();
      await redisClient.del(`refreshToken:${userInDb.id}:${res.body.tokens.refresh.token}`);
    });

    it('should return 400 if email is already taken', async () => {
      const existingUser = {
        name: 'Existing User',
        email: 'admin@example.com', // Use an existing email
        password: 'somepassword',
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(existingUser)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if validation fails (e.g., weak password)', async () => {
      const newUser = {
        name: 'Invalid Pass User',
        email: 'invalidpass@example.com',
        password: 'weak', // Password too short
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing user successfully and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'password123' }) // 'password123' is the seeded password
        .expect(httpStatus.OK);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(adminUser.email);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.access).toBeDefined();
      expect(res.body.tokens.refresh).toBeDefined();

      // Clean up refresh token for this specific login
      await redisClient.del(`refreshToken:${adminUser.id}:${res.body.tokens.refresh.token}`);
    });

    it('should return 401 for incorrect password', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'wrongpassword' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 for non-existent email', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh tokens successfully with a valid refresh token', async () => {
      // First, get new tokens to ensure fresh refresh token for the test
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: regularUser.email, password: 'password123' })
        .expect(httpStatus.OK);

      const oldRefreshToken = loginRes.body.tokens.refresh.token;

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(httpStatus.OK);

      expect(res.body.access).toBeDefined();
      expect(res.body.refresh).toBeDefined();
      expect(res.body.access.token).not.toBe(loginRes.body.tokens.access.token);
      expect(res.body.refresh.token).not.toBe(loginRes.body.tokens.refresh.token);

      // Verify old refresh token is no longer valid in Redis
      const oldTokenInRedis = await redisClient.get(`refreshToken:${regularUser.id}:${oldRefreshToken}`);
      expect(oldTokenInRedis).toBeNull();

      // Clean up the new refresh token
      await redisClient.del(`refreshToken:${regularUser.id}:${res.body.refresh.token}`);
    });

    it('should return 401 for an invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 for an expired refresh token (simulate expiration)', async () => {
      const expiredRefreshToken = authService.tokenService.generateToken(regularUser.id, 'refresh');

      // Manipulate Redis to simulate expiration (or use a very short expiry config)
      await redisClient.set(`refreshToken:${regularUser.id}:${expiredRefreshToken}`, 'valid', { EX: 1 }); // Expires in 1 second

      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for token to expire in Redis

      await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: expiredRefreshToken })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 if refresh token is not found in Redis (e.g., revoked or not issued by system)', async () => {
      const nonExistentRefreshToken = authService.tokenService.generateToken(regularUser.id, 'refresh');
      // Do NOT store this token in Redis

      await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: nonExistentRefreshToken })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
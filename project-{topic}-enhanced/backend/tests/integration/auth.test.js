```javascript
import request from 'supertest';
import app from '../../src/app';
import httpStatus from 'http-status';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import config from '../../src/config';
import jwt from 'jsonwebtoken';
import cache from '../../src/utils/cache';

const prisma = new PrismaClient();

describe('Auth routes', () => {
  let newUser;
  let hashedPassword;

  beforeEach(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);
    // Create a user for login/logout/refresh tests
    newUser = await prisma.user.create({
      data: {
        username: 'integrationtest',
        email: 'integration@test.com',
        passwordHash: hashedPassword,
      },
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.user.deleteMany({
      where: { email: { in: ['integration@test.com', 'new@test.com'] } },
    });
    // Ensure cache is clear
    await cache.getClient().flushdb();
  });


  describe('POST /api/auth/register', () => {
    test('should return 201 and user/tokens if registration is successful', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@test.com',
          password: 'password123',
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username', 'newuser');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');

      const userInDb = await prisma.user.findUnique({ where: { email: 'new@test.com' } });
      expect(userInDb).toBeDefined();
      expect(await bcrypt.compare('password123', userInDb.passwordHash)).toBe(true);

      // Check if refresh token is cached
      const cachedRefreshToken = await cache.get(`refreshToken:${userInDb.id}`);
      expect(cachedRefreshToken).toBe(res.body.tokens.refreshToken.token);
    });

    test('should return 400 if email is already taken', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: newUser.email, // Use existing user's email
          password: 'password123',
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if username is already taken', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            username: newUser.username, // Use existing user's username
            email: 'another@test.com',
            password: 'password123',
          })
          .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if required fields are missing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
        })
        .expect(httpStatus.BAD_REQUEST); // Missing email
    });
  });

  describe('POST /api/auth/login', () => {
    test('should return 200 and user/tokens if login is successful', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUser.email,
          password: 'password123',
        })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', newUser.id);
      expect(res.body.user).toHaveProperty('email', newUser.email);
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');

      const cachedRefreshToken = await cache.get(`refreshToken:${newUser.id}`);
      expect(cachedRefreshToken).toBe(res.body.tokens.refreshToken.token);
    });

    test('should return 401 if email is incorrect', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'password123',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 if password is incorrect', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: newUser.email,
          password: 'wrongpassword',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 if required fields are missing', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        })
        .expect(httpStatus.BAD_REQUEST); // Missing email
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;
    let accessToken;

    beforeEach(async () => {
      // Log in to get tokens
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: 'password123' })
        .expect(httpStatus.OK);

      accessToken = loginRes.body.tokens.accessToken.token;
      refreshToken = loginRes.body.tokens.refreshToken.token;
    });

    test('should return 200 and new tokens if refresh token is valid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens.accessToken.token).not.toBe(accessToken); // Should be new token
      expect(res.body.tokens.refreshToken.token).not.toBe(refreshToken); // Should be new token

      const cachedRefreshToken = await cache.get(`refreshToken:${newUser.id}`);
      expect(cachedRefreshToken).toBe(res.body.tokens.refreshToken.token);
    });

    test('should return 401 if refresh token is invalid', async () => {
      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalidtoken' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 if refresh token is expired', async () => {
      // Temporarily mock JWT verification to make a token expire quickly
      const oldJwtSecret = config.jwt.secret;
      const oldAccessExpiry = config.jwt.accessExpirationMinutes;
      const oldRefreshExpiry = config.jwt.refreshExpirationDays;

      config.jwt.secret = 'testsecret';
      config.jwt.accessExpirationMinutes = 0; // Expire immediately
      config.jwt.refreshExpirationDays = 0; // Expire immediately

      // Generate a token that's immediately expired
      const expiredRefreshToken = jwt.sign({ sub: newUser.id, type: 'refresh' }, 'testsecret', { expiresIn: '1s' });

      // Wait for it to actually expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredRefreshToken })
        .expect(httpStatus.UNAUTHORIZED);

      // Restore original config
      config.jwt.secret = oldJwtSecret;
      config.jwt.accessExpirationMinutes = oldAccessExpiry;
      config.jwt.refreshExpirationDays = oldRefreshExpiry;
    });

    test('should return 401 if refresh token is revoked (not in cache)', async () => {
      await cache.del(`refreshToken:${newUser.id}`); // Remove from cache

      await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: 'password123' })
        .expect(httpStatus.OK);

      accessToken = loginRes.body.tokens.accessToken.token;
      refreshToken = loginRes.body.tokens.refreshToken.token;
    });

    test('should return 204 and remove refresh token from cache if user logs out', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const cachedRefreshToken = await cache.get(`refreshToken:${newUser.id}`);
      expect(cachedRefreshToken).toBeNull();
    });

    test('should return 401 if no access token is provided', async () => {
      await request(app).post('/api/auth/logout').expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 if access token is invalid', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer invalidtoken`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
```
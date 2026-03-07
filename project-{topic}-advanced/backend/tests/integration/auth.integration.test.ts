```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/data-source';
import { User, UserRole } from '../../src/entities/User';
import { getRedisClient } from '../../src/config/redis';

describe('Auth API Integration Tests', () => {
  let redisClient = getRedisClient();
  let server: any;

  beforeAll((done) => {
    server = app.listen(4000, done); // Start app on a different port for testing
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined(); // Check for http-only refresh token cookie
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');

      const userInDb = await AppDataSource.getRepository(User).findOneBy({ email: 'newuser@example.com' });
      expect(userInDb).toBeDefined();
    });

    it('should return 400 if username or email already exists', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'dupuser',
          email: 'dup@example.com',
          password: 'password123',
        });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'dupuser',
          email: 'another@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('User with that username or email already exists.');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'sh', // too short
          email: 'invalid-email',
          password: '123', // too short
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: User;
    const userPassword = 'loginpassword123';

    beforeEach(async () => {
      const userRepository = AppDataSource.getRepository(User);
      testUser = userRepository.create({
        username: 'testlogin',
        email: 'testlogin@example.com',
        passwordHash: await require('bcryptjs').hash(userPassword, 10),
        roles: [UserRole.USER],
      });
      await userRepository.save(testUser);
    });

    it('should log in an existing user with email and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: userPassword,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });

    it('should log in an existing user with username and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testUser.username,
          password: userPassword,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: 'nonexistent@example.com',
          password: userPassword,
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser: User;
    let refreshToken: string;

    beforeEach(async () => {
      const userRepository = AppDataSource.getRepository(User);
      testUser = userRepository.create({
        username: 'refresh_test',
        email: 'refresh@example.com',
        passwordHash: await require('bcryptjs').hash('pass', 10),
        roles: [UserRole.USER],
      });
      await userRepository.save(testUser);

      // Manually create a refresh token and set it in Redis for testing
      refreshToken = require('jsonwebtoken').sign({ id: testUser.id, username: testUser.username, email: testUser.email, roles: testUser.roles }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
      await redisClient.setEx(`refreshToken:${testUser.id}:${refreshToken}`, 604800, 'active'); // 7 days in seconds
    });

    it('should refresh access token with a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');

      // Verify old token is deleted and new one is set in Redis
      const oldTokenStatus = await redisClient.get(`refreshToken:${testUser.id}:${refreshToken}`);
      expect(oldTokenStatus).toBeNull();
      // Cannot easily check the new token without parsing the cookie
    });

    it('should return 400 if no refresh token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh'); // No cookie

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('No refresh token provided.');
    });

    it('should return 401 for an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=invalidtoken']);

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid or expired refresh token.');
    });

    it('should return 401 if refresh token is revoked in Redis', async () => {
      await redisClient.del(`refreshToken:${testUser.id}:${refreshToken}`); // Revoke it
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid or expired refresh token.');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: User;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const userRepository = AppDataSource.getRepository(User);
      testUser = userRepository.create({
        username: 'logout_test',
        email: 'logout@example.com',
        passwordHash: await require('bcryptjs').hash('pass', 10),
        roles: [UserRole.USER],
      });
      await userRepository.save(testUser);

      accessToken = require('jsonwebtoken').sign({ id: testUser.id, username: testUser.username, email: testUser.email, roles: testUser.roles }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      refreshToken = require('jsonwebtoken').sign({ id: testUser.id, username: testUser.username, email: testUser.email, roles: testUser.roles }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
      await redisClient.setEx(`refreshToken:${testUser.id}:${refreshToken}`, 604800, 'active');
    });

    it('should log out a user and clear refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Logged out successfully');
      expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT/); // Clear cookie

      const tokenStatus = await redisClient.get(`refreshToken:${testUser.id}:${refreshToken}`);
      expect(tokenStatus).toBeNull();
    });

    it('should return 401 if no access token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser: User;
    let accessToken: string;

    beforeEach(async () => {
      const userRepository = AppDataSource.getRepository(User);
      testUser = userRepository.create({
        username: 'me_test',
        email: 'me@example.com',
        passwordHash: await require('bcryptjs').hash('pass', 10),
        roles: [UserRole.USER],
      });
      await userRepository.save(testUser);

      accessToken = require('jsonwebtoken').sign({ id: testUser.id, username: testUser.username, email: testUser.email, roles: testUser.roles }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    });

    it('should return authenticated user data', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.id).toBe(testUser.id);
      expect(res.body.user.username).toBe(testUser.username);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.roles).toEqual(testUser.roles);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Not authorized, no token');
    });
  });
});
```
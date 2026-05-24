import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/utils/prisma.js';
import bcrypt from 'bcryptjs';
import config from '../../config/config.js';
import { redisClient } from '../../src/middleware/cache.js';
import { Role } from '@prisma/client';

describe('Auth Integration Tests', () => {
  let testUser;
  const userPassword = 'Password123!';

  beforeAll(async () => {
    // Connect to test database
    // Jest globalTeardown handles disconnect
    config.database.url = process.env.TEST_DATABASE_URL;
    config.redis.url = process.env.REDIS_URL;

    // Ensure database is clean and migrations are applied before tests
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO "user";`); // Replace "user" with your DB user
    await prisma.$executeRawUnsafe(`CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MANAGER');`);
    await prisma.$executeRawUnsafe(`CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "users" (
        "id" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password_hash" TEXT NOT NULL,
        "firstName" TEXT,
        "lastName" TEXT,
        "role" "Role" NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
      CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
    `);

    // Clear Redis before tests
    if (redisClient.isReady) {
      await redisClient.flushdb();
    } else {
      await redisClient.connect();
      await redisClient.flushdb();
    }

    const hashedPassword = await bcrypt.hash(userPassword, 10);
    testUser = await prisma.user.create({
      data: {
        username: 'existinguser',
        email: 'existing@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: Role.USER,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (redisClient.isReady) {
      await redisClient.flushdb(); // Clear Redis again
      await redisClient.disconnect();
    }
  });

  // --- Register Endpoint Tests ---
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return user data', async () => {
      const newUser = {
        username: 'registertest',
        email: 'register@example.com',
        password: 'Password123!',
        firstName: 'Register',
      };
      const res = await request(app).post('/api/v1/auth/register').send(newUser).expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(newUser.email);
      expect(res.body.data).not.toHaveProperty('password'); // Password hash should not be returned
    });

    it('should return 409 if email already exists', async () => {
      const duplicateUser = {
        username: 'anotheruser',
        email: testUser.email, // Use existing email
        password: 'Password123!',
      };
      const res = await request(app).post('/api/v1/auth/register').send(duplicateUser).expect(409);

      expect(res.body.message).toBe('User with this email already exists.');
    });

    it('should return 409 if username already exists', async () => {
      const duplicateUser = {
        username: testUser.username, // Use existing username
        email: 'unique@example.com',
        password: 'Password123!',
      };
      const res = await request(app).post('/api/v1/auth/register').send(duplicateUser).expect(409);

      expect(res.body.message).toBe('User with this username already exists.');
    });

    it('should return 400 for invalid password format', async () => {
      const invalidUser = {
        username: 'badpassword',
        email: 'badpass@example.com',
        password: 'short', // Invalid password
      };
      const res = await request(app).post('/api/v1/auth/register').send(invalidUser).expect(400);
      expect(res.body.message).toMatch(/Password must be at least 8 characters long/);
    });
  });

  // --- Login Endpoint Tests ---
  describe('POST /api/v1/auth/login', () => {
    it('should log in an existing user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: userPassword })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.tokens.access).toHaveProperty('token');
      expect(res.body.data.tokens.refresh).toHaveProperty('token');

      // Verify refresh token is stored in Redis
      const storedRefreshToken = await redisClient.get(`refreshToken:${testUser.id}:${res.body.data.tokens.refresh.token}`);
      expect(storedRefreshToken).toBe('true');
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: userPassword })
        .expect(401);

      expect(res.body.message).toBe('Incorrect email or password');
    });
  });

  // --- Refresh Tokens Endpoint Tests ---
  describe('POST /api/v1/auth/refresh-tokens', () => {
    let refreshToken;

    beforeEach(async () => {
      // Login to get a valid refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: userPassword })
        .expect(200);
      refreshToken = loginRes.body.data.tokens.refresh.token;
    });

    it('should refresh access and refresh tokens', async () => {
      const res = await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken }).expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('access');
      expect(res.body.data).toHaveProperty('refresh');
      expect(res.body.data.access.token).toBeDefined();
      expect(res.body.data.refresh.token).toBeDefined();

      // Verify old token is invalidated and new one stored
      const oldTokenStatus = await redisClient.get(`refreshToken:${testUser.id}:${refreshToken}`);
      expect(oldTokenStatus).toBeNull(); // Old token should be deleted
      const newTokenStatus = await redisClient.get(`refreshToken:${testUser.id}:${res.body.data.tokens.refresh.token}`);
      expect(newTokenStatus).toBe('true'); // New token should be stored
    });

    it('should return 401 for an invalid refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken: 'invalidtoken' }).expect(401);

      expect(res.body.message).toBe('Invalid refresh token.');
    });

    it('should return 401 for an expired refresh token', async () => {
      // Temporarily set a very short refresh token expiration for this test
      config.jwt.refreshExpirationDays = 0.0001; // ~8 seconds for 1 day / (24*60*60)
      const expiredLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: userPassword })
        .expect(200);
      const expiredRefreshToken = expiredLoginRes.body.data.tokens.refresh.token;

      // Wait for token to expire (simulated)
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      const res = await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken: expiredRefreshToken }).expect(401);

      expect(res.body.message).toBe('Refresh token expired.');
      config.jwt.refreshExpirationDays = 1; // Reset to original for other tests
    });

    it('should return 401 if refresh token is not found in store (e.g., already used or logged out)', async () => {
      await redisClient.del(`refreshToken:${testUser.id}:${refreshToken}`); // Manually delete token from Redis
      const res = await request(app).post('/api/v1/auth/refresh-tokens').send({ refreshToken }).expect(401);

      expect(res.body.message).toBe('Refresh token expired or invalid (not found in store).');
    });
  });

  // --- Logout Endpoint Tests ---
  describe('POST /api/v1/auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: userPassword })
        .expect(200);
      refreshToken = loginRes.body.data.tokens.refresh.token;
    });

    it('should invalidate refresh token and return 204', async () => {
      await request(app).post('/api/v1/auth/logout').send({ refreshToken }).expect(204);

      const storedToken = await redisClient.get(`refreshToken:${testUser.id}:${refreshToken}`);
      expect(storedToken).toBeNull(); // Token should be removed from Redis
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'invalidtoken' }).expect(401);

      expect(res.body.message).toBe('Invalid refresh token for logout.');
    });
  });
});
```

```javascript
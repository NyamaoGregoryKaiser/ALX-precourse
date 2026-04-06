```typescript
import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../../src/utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../../src/config/jwt';
import { UserRole } from '@prisma/client';

describe('Auth API', () => {
  beforeEach(async () => {
    // Clear relevant database tables before each test
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and create an account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('Registration successful. Account created.');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.role).toBe('USER');
      expect(res.body.user.accounts).toBeDefined();
      expect(res.body.user.accounts).toHaveLength(1);

      const userInDb = await prisma.user.findUnique({ where: { email: 'newuser@example.com' }, include: { accounts: true } });
      expect(userInDb).toBeDefined();
      expect(userInDb?.email).toBe('newuser@example.com');
      expect(await bcrypt.compare('Password123!', userInDb!.password)).toBe(true);
      expect(userInDb?.accounts).toHaveLength(1);
    });

    it('should return 409 if user with email already exists', async () => {
      const hashedPassword = await bcrypt.hash('existingpass', 10);
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: hashedPassword,
          firstName: 'Existing',
          lastName: 'User',
          role: UserRole.USER,
        },
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'NewPassword123!',
          firstName: 'Another',
          lastName: 'Guy',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid input (e.g., weak password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid@example.com',
          password: 'short', // Too short
          firstName: 'Invalid',
          lastName: 'User',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Password must be at least 8 characters long');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;
    const testPassword = 'Password123!';

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      testUser = await prisma.user.create({
        data: {
          id: 'login-test-user-id',
          email: 'login@example.com',
          password: hashedPassword,
          firstName: 'Login',
          lastName: 'User',
          role: UserRole.USER,
        },
      });
    });

    it('should login an existing user and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: testPassword });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');

      // Verify token
      const decoded: any = jwt.verify(res.body.token, JWT_SECRET);
      expect(decoded.id).toBe(testUser.id);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid credentials (user not found)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: testPassword });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid input (e.g., missing email)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: testPassword });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Email is required');
    });
  });
});
```
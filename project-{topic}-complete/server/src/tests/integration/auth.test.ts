import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/jwt';

const prisma = new PrismaClient();

describe('Auth Integration Tests', () => {
  let user1Token: string;
  let adminToken: string;
  let user1Id: string;
  let adminId: string;

  beforeAll(async () => {
    // Ensure test database is clean (handled by setup.ts) and seed data is present.
    // Use existing seed data for login tests.
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const memberUser1 = await prisma.user.findUnique({ where: { email: 'member1@example.com' } });

    if (!adminUser || !memberUser1) {
      throw new Error("Seeded users not found. Ensure prisma:seed runs correctly in setup.ts.");
    }

    adminId = adminUser.id;
    user1Id = memberUser1.id;

    adminToken = generateToken({ userId: adminId, email: adminUser.email, role: adminUser.role });
    user1Token = generateToken({ userId: user1Id, email: memberUser1.email, role: memberUser1.role });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User registered successfully');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('email', 'newuser@example.com');

      const user = await prisma.user.findUnique({ where: { email: 'newuser@example.com' } });
      expect(user).not.toBeNull();
      if (user) {
        const isPasswordValid = await bcrypt.compare('password123', user.password);
        expect(isPasswordValid).toBe(true);
      }
    });

    it('should return 409 if user with email already exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'admin@example.com', // Already seeded
          password: 'password123',
          firstName: 'Admin',
          lastName: 'User',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual('User with this email already exists.');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'incomplete@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Please provide email, password, first name, and last name.');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'member1@example.com',
          password: 'member123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Logged in successfully');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email', 'member1@example.com');
      expect(res.body.user).toHaveProperty('role', 'MEMBER');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'member1@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials.');
    });

    it('should return 401 for invalid credentials (email not found)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials.');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'member1@example.com',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Please provide email and password.');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the authenticated user\'s profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toHaveProperty('id', user1Id);
      expect(res.body.user).toHaveProperty('email', 'member1@example.com');
      expect(res.body.user).toHaveProperty('role', 'MEMBER');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('No token provided or token format is incorrect.');
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid or expired token.');
    });
  });
});
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User } from '../../src/database/entities/User.entity';
import { UserRole } from '../../src/types/user.types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth API Integration Tests', () => {
  let userRepository = AppDataSource.getRepository(User);
  let adminToken: string;
  let testUser: User;

  beforeAll(async () => {
    // Already initialized in setup.ts
  });

  beforeEach(async () => {
    await userRepository.clear();
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = userRepository.create({
      username: 'apitestuser',
      email: 'apitest@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN, // Or EDITOR for specific tests
    });
    await userRepository.save(testUser);

    adminToken = jwt.sign(
      { id: testUser.id, role: testUser.role, email: testUser.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await userRepository.clear();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'newpassword',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User registered successfully');
      expect(res.body.userId).toBeDefined();

      const user = await userRepository.findOneBy({ email: 'new@example.com' });
      expect(user).toBeDefined();
      expect(user?.username).toBe('newuser');
      expect(user?.role).toBe(UserRole.VIEWER);
    });

    it('should return 409 if email already exists', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'user1', email: 'duplicate@example.com', password: 'password' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'user2', email: 'duplicate@example.com', password: 'password2' });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in a user and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'apitest@example.com', password: 'password123' });

      expect(res.statusCode).toEqual(200);
      expect(res.headers['x-auth-token']).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('apitest@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'apitest@example.com', password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user details for a valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(testUser.id);
      expect(res.body.email).toEqual(testUser.email);
      expect(res.body.role).toEqual(testUser.role);
    });

    it('should return 401 for no token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('No token provided');
    });

    it('should return 401 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid token');
    });
  });
});
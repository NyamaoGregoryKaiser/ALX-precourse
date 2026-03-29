```typescript
import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { config } from '../../config';

// Re-import AppDataSource to ensure tests run against clean DB
// Setup is handled in src/tests/setup.ts

describe('Auth API Endpoints', () => {
  let testUser: User;
  const adminEmail = 'admin@test.com';
  const adminPassword = 'adminpassword';
  let adminToken: string;

  beforeEach(async () => {
    // Create a known admin user for testing authorization
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = AppDataSource.getRepository(User).create({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    });
    testUser = await AppDataSource.getRepository(User).save(adminUser);

    // Generate token for the admin user
    adminToken = jwt.sign(
      { userId: testUser.id, role: testUser.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  });

  // --- POST /api/auth/register ---
  describe('POST /api/auth/register', () => {
    it('should register a new user and return user data (without password)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          role: 'user',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email', 'newuser@example.com');
      expect(res.body.user).toHaveProperty('role', 'user');
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned

      const userInDb = await AppDataSource.getRepository(User).findOneBy({ email: 'newuser@example.com' });
      expect(userInDb).not.toBeNull();
      expect(await bcrypt.compare('password123', userInDb!.password)).toBe(true);
    });

    it('should return 409 if user with email already exists', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'anotherpassword' });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('message', 'User with this email already exists');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email and password are required');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'missingpass@example.com' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email and password are required');
    });
  });

  // --- POST /api/auth/login ---
  describe('POST /api/auth/login', () => {
    it('should login an existing user and return a JWT token', async () => {
      const loginEmail = 'existing@example.com';
      const loginPassword = 'securepassword';
      const hashedPassword = await bcrypt.hash(loginPassword, 10);
      await AppDataSource.getRepository(User).save({
        email: loginEmail,
        password: hashedPassword,
        role: 'user',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: loginPassword });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('role', 'user');
      expect(typeof res.body.token).toBe('string');

      // Verify token
      const decoded: any = jwt.verify(res.body.token, config.jwtSecret);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('role', 'user');
    });

    it('should return 401 for invalid password', async () => {
      const loginEmail = 'invalidpass@example.com';
      const loginPassword = 'correctpassword';
      const hashedPassword = await bcrypt.hash(loginPassword, 10);
      await AppDataSource.getRepository(User).save({
        email: loginEmail,
        password: hashedPassword,
        role: 'user',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
      expect(res.body).not.toHaveProperty('token');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email and password are required');
    });
  });

  // --- GET /api/users (requires admin) ---
  describe('GET /api/users', () => {
    it('should allow admin to get all users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1); // At least the admin user
      expect(res.body[0]).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Authentication failed: No token provided');
    });

    it('should return 403 if user is not admin', async () => {
      const normalUserEmail = 'normal@test.com';
      const normalUserPassword = 'normalpassword';
      const hashedPassword = await bcrypt.hash(normalUserPassword, 10);
      const normalUser = await AppDataSource.getRepository(User).save({
        email: normalUserEmail,
        password: hashedPassword,
        role: 'user',
      });
      const normalUserToken = jwt.sign(
        { userId: normalUser.id, role: normalUser.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: Requires one of the following roles: admin');
    });
  });

  // --- Other User Endpoints (Auth & Authz tests) ---
  describe('User CRUD endpoints authorization', () => {
    let normalUser: User;
    let normalUserToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('normalpass', 10);
      normalUser = AppDataSource.getRepository(User).create({
        email: 'normaluser@test.com',
        password: hashedPassword,
        role: 'user',
      });
      await AppDataSource.getRepository(User).save(normalUser);
      normalUserToken = jwt.sign({ userId: normalUser.id, role: normalUser.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    });

    it('normal user should be able to get their own profile', async () => {
      const res = await request(app)
        .get(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toEqual(normalUser.email);
    });

    it('normal user should NOT be able to get another user\'s profile', async () => {
      const res = await request(app)
        .get(`/api/users/${testUser.id}`) // testUser is admin, normalUser tries to get admin's profile
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: You can only view your own profile');
    });

    it('admin should be able to get any user\'s profile', async () => {
      const res = await request(app)
        .get(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toEqual(normalUser.email);
    });

    it('normal user should be able to update their own profile', async () => {
      const res = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ email: 'updated_normal@test.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.email).toEqual('updated_normal@test.com');
    });

    it('normal user should NOT be able to update another user\'s profile', async () => {
      const res = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ email: 'attempt_to_update_admin@test.com' });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: You can only update your own profile');
    });

    it('normal user should NOT be able to change their role', async () => {
      const res = await request(app)
        .put(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ role: 'admin' });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: You cannot change your role');
    });

    it('admin should be able to delete any user', async () => {
      const res = await request(app)
        .delete(`/api/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      const userInDb = await AppDataSource.getRepository(User).findOneBy({ id: normalUser.id });
      expect(userInDb).toBeNull();
    });

    it('normal user should NOT be able to delete another user', async () => {
      const res = await request(app)
        .delete(`/api/users/${testUser.id}`) // normalUser tries to delete admin
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: You can only delete your own account');
    });
  });
});
```
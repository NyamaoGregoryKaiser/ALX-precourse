```typescript
import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../data-source';
import { User } from '../../models/User.entity';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../../utils/appError'; // Ensure AppError is imported for type safety

describe('Auth Controller Integration', () => {
  let testUser: User;
  const testPassword = 'testpassword123';
  let adminUser: User;
  const adminPassword = 'adminpassword123';
  let adminToken: string;

  beforeAll(async () => {
    // Initialize test database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    // Clear users table to ensure a clean state for tests
    await AppDataSource.getRepository(User).delete({});

    // Create a regular user for login tests
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testUser = AppDataSource.getRepository(User).create({
      username: 'integrationtestuser',
      email: 'integration@example.com',
      password: hashedPassword,
      role: 'member',
    });
    await AppDataSource.getRepository(User).save(testUser);

    // Create an admin user for permission tests
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    adminUser = AppDataSource.getRepository(User).create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: adminHashedPassword,
      role: 'admin',
    });
    await AppDataSource.getRepository(User).save(adminUser);

    // Log in admin to get a token for protected routes
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: adminPassword });
    adminToken = adminLoginRes.body.token;
  });

  afterAll(async () => {
    // Clear users table again after all tests
    await AppDataSource.getRepository(User).delete({});
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'newuserpassword',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', 'newuser@example.com');
      expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should return 409 if user with email already exists', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'anotheruser',
          email: 'integration@example.com', // Duplicate email
          password: 'anotherpassword',
        })
        .expect(409);

      expect(response.body).toHaveProperty('message', 'User with this email or username already exists');
    });

    it('should return 409 if user with username already exists', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'integrationtestuser', // Duplicate username
          email: 'unique@example.com',
          password: 'anotherpassword',
        })
        .expect(409);

      expect(response.body).toHaveProperty('message', 'User with this email or username already exists');
    });

    it('should return 400 for invalid input (Joi validation)', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'inv', // Too short
          email: 'invalid-email', // Invalid format
          password: 'short', // Too short
        })
        .expect(400); // Expect a bad request due to validation errors
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing user successfully and return a token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.user).toHaveProperty('id', testUser.id);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 401 for invalid credentials (non-existent email)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 400 for invalid input (Joi validation)', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'anypassword',
        })
        .expect(400); // Expect a bad request due to validation errors
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the authenticated user\'s profile', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testPassword });
      const token = loginRes.body.token;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401); // Authentication token missing
    });

    it('should return 403 if an invalid token is provided', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(403); // Invalid or expired token
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 for a valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User logged out (client-side token removal expected).');
    });

    it('should return 401 if no token is provided', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });
});
```
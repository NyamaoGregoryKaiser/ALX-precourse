```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import { createApp } from '../../src/app';
import { User } from '../../src/entities/User';
import * as bcrypt from 'bcryptjs';
import { Application } from 'express';

// Extend AppDataSource with a method to clear tables for testing
interface TestDataSource extends AppDataSource {
    clear: (entity: any) => Promise<void>;
}

// Add a clear method to AppDataSource for testing purposes
(AppDataSource as TestDataSource).clear = async (entity: any) => {
    const repository = AppDataSource.getRepository(entity);
    await repository.query(`TRUNCATE TABLE "${repository.metadata.tableName}" CASCADE;`);
};


describe('Auth API (E2E/API Tests)', () => {
  let app: Application;

  beforeAll(async () => {
    // Initialize DB connection for tests
    await AppDataSource.initialize();
    app = createApp();
  });

  afterAll(async () => {
    // Close DB connection after all tests
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear all users before each test to ensure a clean state
    await (AppDataSource as TestDataSource).clear(User);
  });

  // --- POST /api/auth/register ---
  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const newUser = {
        username: 'testuser_reg',
        email: 'register@example.com',
        password: 'password123',
      };

      const res = await request(app).post('/api/auth/register').send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.message).toEqual('User registered successfully. Please log in.');
      expect(res.body.data.username).toEqual(newUser.username);
      expect(res.body.data.email).toEqual(newUser.email);
      expect(res.body.data.id).toBeDefined();

      // Verify user exists in DB
      const userInDb = await AppDataSource.getRepository(User).findOneBy({ email: newUser.email });
      expect(userInDb).toBeDefined();
      expect(await bcrypt.compare(newUser.password, userInDb!.password)).toBe(true);
      expect(userInDb!.role).toEqual('user');
    });

    it('should return 409 if email already registered', async () => {
      // First register a user
      await request(app).post('/api/auth/register').send({
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123',
      });

      // Try to register with same email
      const res = await request(app).post('/api/auth/register').send({
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password456',
      });

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toEqual('Email already registered');
    });

    it('should return 409 if username already taken', async () => {
      // First register a user
      await request(app).post('/api/auth/register').send({
        username: 'duplicate_username',
        email: 'email1@example.com',
        password: 'password123',
      });

      // Try to register with same username
      const res = await request(app).post('/api/auth/register').send({
        username: 'duplicate_username',
        email: 'email2@example.com',
        password: 'password456',
      });

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toEqual('Username already taken');
    });

    it('should return 400 for invalid input (e.g., short password)', async () => {
      const invalidUser = {
        username: 'shortpass',
        email: 'invalid@example.com',
        password: '123', // Too short
      };

      const res = await request(app).post('/api/auth/register').send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Validation error: String must contain at least 6 character(s)');
    });
  });

  // --- POST /api/auth/login ---
  describe('POST /api/auth/login', () => {
    let registeredUser: User;
    const userPassword = 'loginpassword123';

    beforeEach(async () => {
      // Ensure a user exists for login tests
      registeredUser = AppDataSource.getRepository(User).create({
        username: 'loginuser',
        email: 'login@example.com',
        password: await bcrypt.hash(userPassword, 10),
        role: 'user',
      });
      await AppDataSource.getRepository(User).save(registeredUser);
    });

    it('should successfully log in an existing user and return tokens', async () => {
      const credentials = {
        email: registeredUser.email,
        password: userPassword,
      };

      const res = await request(app).post('/api/auth/login').send(credentials);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.message).toEqual('Logged in successfully');
      expect(res.body.data.id).toEqual(registeredUser.id);
      expect(res.body.data.email).toEqual(registeredUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const credentials = {
        email: registeredUser.email,
        password: 'wrongpassword',
      };

      const res = await request(app).post('/api/auth/login').send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toEqual('Invalid credentials');
    });

    it('should return 401 for invalid credentials (non-existent email)', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: userPassword,
      };

      const res = await request(app).post('/api/auth/login').send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toEqual('Invalid credentials');
    });

    it('should return 400 for invalid input (e.g., missing email)', async () => {
      const invalidCredentials = {
        password: userPassword,
      };

      const res = await request(app).post('/api/auth/login').send(invalidCredentials);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Validation error');
    });
  });
});
```
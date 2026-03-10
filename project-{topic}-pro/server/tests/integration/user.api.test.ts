import request from 'supertest';
import { createApp } from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User } from '../../src/database/entities/User';
import { config } from '../../src/config'; // Make sure this is correctly configured for test env
import { AuthService } from '../../src/auth/auth.service';
import { RedisServiceInstance } from '../../src/services/redis.service'; // Mock Redis for tests

let app: any;
let server: any;
let authToken: string;
let testUser: User;

// Mock RedisService to prevent actual Redis connections during integration tests
jest.mock('../../src/services/redis.service', () => ({
  RedisServiceInstance: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    setUserOnline: jest.fn(),
    removeUserOnline: jest.fn(),
    isUserOnline: jest.fn(() => Promise.resolve(true)),
    cacheData: jest.fn(),
    getCachedData: jest.fn(),
  },
}));

describe('User API Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    config.dbName = 'chat_test_db'; // Ensure test DB is used
    config.jwtSecret = 'test_jwt_secret'; // Use a consistent secret for testing
    config.redisUrl = 'redis://localhost:6379'; // Still mock, but good to set

    await AppDataSource.initialize();
    await AppDataSource.dropDatabase();
    await AppDataSource.runMigrations();

    const { app: expressApp, server: httpServer } = createApp();
    app = expressApp;
    server = httpServer;

    const authService = new AuthService();
    // Register a test user
    testUser = await authService.register({
      username: 'testuser_api',
      email: 'test_api@example.com',
      password: 'testpassword',
    });

    // Log in the test user to get a token
    authToken = await authService.login({
      email: 'test_api@example.com',
      password: 'testpassword',
    });

    // Register another user for 'getAllUsers' and potential private chats
    await authService.register({
      username: 'anotheruser_api',
      email: 'another_api@example.com',
      password: 'anotherpassword',
    });
  });

  afterAll(async () => {
    await AppDataSource.destroy();
    server.close();
  });

  describe('GET /api/users/me', () => {
    it('should return the authenticated user\'s profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUser.id);
      expect(res.body).toHaveProperty('username', testUser.username);
      expect(res.body).toHaveProperty('email', testUser.email);
      expect(res.body).not.toHaveProperty('password'); // Password should be excluded
    });

    it('should return 401 if no token is provided', async () => {
      await request(app)
        .get('/api/users/me')
        .expect(401);
    });

    it('should return 401 if invalid token is provided', async () => {
      await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer invalidtoken`)
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return a list of all users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // At least testuser_api and anotheruser_api
      expect(res.body[0]).not.toHaveProperty('password');
      expect(res.body.some((user: User) => user.id === testUser.id)).toBe(true);
      expect(res.body.some((user: User) => user.username === 'anotheruser_api')).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a specific user by ID', async () => {
      const res = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testUser.id);
      expect(res.body).toHaveProperty('username', testUser.username);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 404 if user not found', async () => {
      await request(app)
        .get(`/api/users/non-existent-uuid`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .get(`/api/users/${testUser.id}`)
        .expect(401);
    });
  });
});
```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import app from '../../src/app';
import { User, UserRole } from '../../src/entities/User';
import { DataSource, Repository } from 'typeorm';

// Disable console logs during tests to keep output clean
jest.mock('../../src/services/logger.service', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Auth Integration Tests', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    // Ensure test database configuration
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'sqlinsight_test_db';
    process.env.DB_SYNCHRONIZE = 'true'; // Use synchronize for tests, easier setup
    process.env.DB_LOGGING = 'false';

    // Initialize the real database for integration tests
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    dataSource = AppDataSource;
    userRepository = dataSource.getRepository(User);
  });

  beforeEach(async () => {
    // Clear the users table before each test
    await userRepository.clear();
  });

  afterAll(async () => {
    // Close database connection after all tests
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'register@example.com',
        password: 'SecurePassword123!',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.user.role).toBe(UserRole.USER); // Default role
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      const userInDb = await userRepository.findOneBy({ email: userData.email });
      expect(userInDb).toBeDefined();
      expect(await userInDb?.comparePassword(userData.password)).toBe(true);
    });

    it('should return 409 if email already registered', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
      };
      await userRepository.save(userRepository.create({ email: userData.email, password: await new User().hashPassword(userData.password) }));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User with this email already exists.');
    });

    it('should return 400 for invalid password format', async () => {
      const userData = {
        email: 'invalidpass@example.com',
        password: 'short', // Too short
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation Failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: User;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      testUser = userRepository.create({ email: 'login@example.com' });
      testUser.password = await testUser.hashPassword(testPassword);
      await userRepository.save(testUser);
    });

    it('should log in a user successfully with correct credentials', async () => {
      const userData = {
        email: testUser.email,
        password: testPassword,
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(userData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged in successfully');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for incorrect password', async () => {
      const userData = {
        email: testUser.email,
        password: 'WrongPassword!',
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(userData)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials.');
    });

    it('should return 401 for non-existent email', async () => {
      const userData = {
        email: 'nonexistent@example.com',
        password: testPassword,
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(userData)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials.');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser: User;
    let accessToken: string;

    beforeEach(async () => {
      testUser = userRepository.create({ email: 'me@example.com' });
      testUser.password = await testUser.hashPassword('Password123!');
      testUser.role = UserRole.ADMIN; // Give admin role for testing
      await userRepository.save(testUser);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'Password123!' });
      accessToken = loginRes.body.data.accessToken;
    });

    it('should return the authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testUser.id);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.role).toBe(testUser.role);
      expect(res.body.data).not.toHaveProperty('password'); // Password should not be exposed
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication invalid: No token provided or malformed.');
    });

    it('should return 401 if invalid token provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer invalid.token.string`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication invalid: Invalid token.');
    });
  });
});
```

### Frontend (`frontend/`)

Using React with TypeScript.

#### `frontend/package.json`
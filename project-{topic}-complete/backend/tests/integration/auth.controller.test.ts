```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/database/data-source';
import app from '../../src/app';
import { User, UserRole } from '../../src/modules/users/user.entity';
import { config } from '../../src/config';
import { redisClient } from '../../src/config/redis';

// Use a separate test database
const TEST_DB_CONFIG = {
  ...config.DATABASE,
  NAME: 'ecommerce_test_db',
};

// Initialize the data source for testing
const testDataSource = AppDataSource.extend({
  database: TEST_DB_CONFIG.NAME,
});

describe('Auth Controller Integration Tests', () => {
  let adminUser: User;
  let customerUser: User;

  beforeAll(async () => {
    // Connect to test database and run migrations
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    await testDataSource.runMigrations();

    // Clear existing users
    await testDataSource.getRepository(User).delete({});

    // Create a default admin user for testing authorization
    const adminRepo = testDataSource.getRepository(User);
    adminUser = adminRepo.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin_auth@test.com',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
      isActive: true,
    });
    (adminUser as any).setNew(true); // Manually set for BeforeInsert hook
    await adminUser.hashPassword(); // Hash password before saving
    adminUser = await adminRepo.save(adminUser);

    // Create a default customer user
    const customerRepo = testDataSource.getRepository(User);
    customerUser = customerRepo.create({
      firstName: 'Customer',
      lastName: 'User',
      email: 'customer_auth@test.com',
      password: 'CustomerPassword123!',
      role: UserRole.CUSTOMER,
      isActive: true,
    });
    (customerUser as any).setNew(true);
    await customerUser.hashPassword();
    customerUser = await customerRepo.save(customerUser);

    // Connect Redis for rate limiting & caching tests
    if (!redisClient.isReady) {
      await redisClient.connect();
    }
    // Clear any existing rate limit keys for the test IP
    await redisClient.flushdb();
  });

  afterAll(async () => {
    // Clear the test database
    await testDataSource.dropDatabase();
    await testDataSource.destroy();
    // Close Redis connection
    await redisClient.quit();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer user successfully', async () => {
      const newUser = {
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@test.com',
        password: 'TestPassword123!',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(newUser.email);
      expect(res.body.data.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.token).toBeDefined();

      const createdUser = await testDataSource.getRepository(User).findOne({ where: { email: newUser.email } });
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(newUser.email);
    });

    it('should return 409 if user with email already exists', async () => {
      const existingUser = {
        firstName: 'Existing',
        lastName: 'User',
        email: 'customer_auth@test.com', // Use existing email
        password: 'AnotherPassword123!',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(existingUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Duplicate value for email');
    });

    it('should return 400 for invalid input', async () => {
      const invalidUser = {
        firstName: 'Inv',
        email: 'invalid-email',
        password: '123',
      };
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in an existing user successfully', async () => {
      const credentials = {
        email: customerUser.email,
        password: 'CustomerPassword123!',
      };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(customerUser.email);
      expect(res.body.token).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const credentials = {
        email: customerUser.email,
        password: 'WrongPassword!',
      };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password.');
    });

    it('should return 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: customerUser.email });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Password is required.');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let customerToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: customerUser.email, password: 'CustomerPassword123!' });
      customerToken = res.body.token;
    });

    it('should return the authenticated user\'s profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(customerUser.email);
      expect(res.body.data.user.id).toBe(customerUser.id);
      expect(res.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
    });

    it('should return 401 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid token! Please log in again.');
    });
  });
});
```
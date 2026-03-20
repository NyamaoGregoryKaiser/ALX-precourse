const request = require('supertest');
const app = require('../../app');
const prisma = require('../../../prisma/client');
const { USER_ROLES } = require('../../config/constants');
const bcrypt = require('bcryptjs');

describe('Auth API', () => {
  // Clean up database before each test to ensure isolation
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clear all users
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully with default role', async () => {
      const newUser = {
        username: 'register_test_user',
        email: 'register@example.com',
        password: 'password123'
      };

      const res = await request(app).post('/api/v1/auth/register').send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User registered successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toEqual(newUser.email);
      expect(res.body.user.role).toEqual(USER_ROLES.MEMBER); // Default role
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.accessToken).toBeDefined();

      // Verify user in database
      const userInDb = await prisma.user.findUnique({ where: { email: newUser.email } });
      expect(userInDb).not.toBeNull();
      expect(userInDb.username).toEqual(newUser.username);
      expect(await bcrypt.compare(newUser.password, userInDb.password)).toBe(true);
    });

    it('should register a new user with a specified role if allowed', async () => {
      const newUser = {
        username: 'admin_register',
        email: 'admin_register@example.com',
        password: 'adminpassword',
        role: USER_ROLES.ADMIN
      };

      const res = await request(app).post('/api/v1/auth/register').send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.user.role).toEqual(USER_ROLES.ADMIN);
    });

    it('should return 409 if email already exists', async () => {
      const existingUser = {
        username: 'existing',
        email: 'duplicate@example.com',
        password: 'password123'
      };
      await request(app).post('/api/v1/auth/register').send(existingUser); // Register first user

      const res = await request(app).post('/api/v1/auth/register').send(existingUser); // Try to register again

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual('User with this email already exists.');
    });

    it('should return 400 if validation fails (e.g., missing email)', async () => {
      const invalidUser = {
        username: 'invalid',
        password: 'password123'
      };
      const res = await request(app).post('/api/v1/auth/register').send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation error');
      expect(res.body.errors).toContain('"email" is required');
    });

    it('should return 400 if password is too short', async () => {
      const invalidUser = {
        username: 'shortpass',
        email: 'shortpass@example.com',
        password: '123' // Min 6 chars
      };
      const res = await request(app).post('/api/v1/auth/register').send(invalidUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation error');
      expect(res.body.errors).toContain('"password" length must be at least 6 characters long');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let registeredUser;
    const userCredentials = {
      email: 'login@example.com',
      password: 'validpassword123'
    };

    beforeEach(async () => {
      // Register a user first for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'login_user',
          email: userCredentials.email,
          password: userCredentials.password
        });

      registeredUser = await prisma.user.findUnique({ where: { email: userCredentials.email } });
    });

    it('should log in an existing user successfully', async () => {
      const res = await request(app).post('/api/v1/auth/login').send(userCredentials);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Logged in successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toEqual(userCredentials.email);
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.accessToken).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: userCredentials.email,
        password: 'wrongpassword'
      });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid email or password.');
    });

    it('should return 401 for unregistered email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'anypassword'
      });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid email or password.');
    });

    it('should return 400 if validation fails (e.g., missing email)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        password: userCredentials.password
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation error');
      expect(res.body.errors).toContain('"email" is required');
    });
  });
});
```

#### Performance Tests (Conceptual)

Performance tests are typically done with specialized tools like **JMeter**, **K6**, or **Artillery**. Here's a conceptual approach and a simple K6 script.

**Approach:**

1.  **Identify Critical Endpoints**: Login, Create Task, Get Projects/Tasks are good candidates.
2.  **Define Load Scenarios**:
    *   **Smoke Test**: Small number of users (e.g., 5) for a short duration to ensure basic functionality under load.
    *   **Load Test**: Gradually increase users to find bottlenecks and check stability (e.g., 50-100 users over 10-30 minutes).
    *   **Stress Test**: Push beyond expected load to find breaking points.
    *   **Soak Test**: Run a moderate load for a long duration (hours) to check for memory leaks or resource exhaustion.
3.  **Metrics to Monitor**:
    *   **Response Time**: Latency for API calls.
    *   **Throughput**: Requests per second (RPS).
    *   **Error Rate**: Percentage of failed requests.
    *   **System Resources**: CPU, Memory, Network I/O of the backend, database, and Redis.
    *   **Database Query Performance**: Slow query logs, connection pool utilization.
    *   **Cache Hit Rate**: Effectiveness of Redis cache.

**Simple K6 Script Example (`load_test.js` in root or `src/tests/performance`)**

```javascript
import request from 'supertest';
import app from '../../src/app'; // The Express app
import prisma from '../../src/config/prisma'; // Prisma client
import { hashPassword } from '../../src/utils/password';
import { StatusCodes } from 'http-status-codes';
import { User, Role } from '@prisma/client';

// Use a distinct port for tests to avoid conflicts with development server
const TEST_PORT = 5001; // Or ensure app instance is only started for tests
let server: any; // Store the server instance for closing

// Clear and seed test database before running tests
beforeAll(async () => {
  server = app.listen(TEST_PORT); // Start the server for integration tests
  // Note: Test setup script already handles migrations and seeding,
  // but we might want to add specific users for these tests.
});

afterAll(async () => {
  await server.close(); // Close the server after tests
  // The setup.ts `afterAll` hook will handle database cleanup.
});

describe('Auth API', () => {
  const registerUrl = '/api/v1/auth/register';
  const loginUrl = '/api/v1/auth/login';

  beforeEach(async () => {
    // Clean up specific test users between tests if needed,
    // though global truncate in setup.ts usually suffices.
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testuser@example.com', 'existing@example.com'],
        },
      },
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'testuser@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const res = await request(app).post(registerUrl).send(userData);

      expect(res.statusCode).toEqual(StatusCodes.CREATED);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.user.role).toBe(Role.MEMBER); // Default role
      expect(res.body.data.user.password).toBeUndefined(); // Password should not be returned

      // Verify user exists in DB
      const userInDb = await prisma.user.findUnique({ where: { email: userData.email } });
      expect(userInDb).toBeDefined();
      expect(userInDb?.email).toBe(userData.email);
    });

    it('should return 409 if user with email already exists', async () => {
      // Create a user first
      const hashedPassword = await hashPassword('Password123!');
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: hashedPassword,
          firstName: 'Existing',
          lastName: 'User',
          role: Role.MEMBER,
        },
      });

      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Another',
        lastName: 'User',
      };

      const res = await request(app).post(registerUrl).send(userData);

      expect(res.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid input (e.g., invalid email)', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const res = await request(app).post(registerUrl).send(userData);

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0]).toContain('email: Invalid email address');
    });

    it('should return 400 for invalid input (e.g., weak password)', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short', // Too short and no special chars
        firstName: 'Test',
        lastName: 'User',
      };

      const res = await request(app).post(registerUrl).send(userData);

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('password: Password must be at least 8 characters long'),
          expect.stringContaining('password: Password must contain at least one lowercase letter'),
          expect.stringContaining('password: Password must contain at least one uppercase letter'),
          expect.stringContaining('password: Password must contain at least one number'),
          expect.stringContaining('password: Password must contain at least one special character')
        ])
      );
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: User;
    const testUserPassword = 'LoginPassword123!';

    beforeEach(async () => {
      // Create a user for login tests
      const hashedPassword = await hashPassword(testUserPassword);
      testUser = await prisma.user.create({
        data: {
          email: 'login@example.com',
          password: hashedPassword,
          firstName: 'Login',
          lastName: 'User',
          role: Role.MEMBER,
        },
      });
    });

    it('should log in a user successfully and return a token', async () => {
      const loginData = {
        email: 'login@example.com',
        password: testUserPassword,
      };

      const res = await request(app).post(loginUrl).send(loginData);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(loginData.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 401 for incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword!',
      };

      const res = await request(app).post(loginUrl).send(loginData);

      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: testUserPassword,
      };

      const res = await request(app).post(loginUrl).send(loginData);

      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Incorrect email or password');
    });

    it('should return 429 for too many login attempts (rate limit)', async () => {
        const loginData = {
            email: 'login@example.com',
            password: 'WrongPassword!',
        };

        // Send multiple requests to trigger rate limit (configured for 5 reqs per 10s in local env)
        for (let i = 0; i < 6; i++) {
            const res = await request(app).post(loginUrl).send(loginData);
            if (i === 5) { // The 6th request should be rate-limited
                expect(res.statusCode).toEqual(StatusCodes.TOO_MANY_REQUESTS);
                expect(res.body.status).toBe('fail');
                expect(res.body.message).toBe('Too many login attempts from this IP, please try again after 1 minute.');
            } else {
                expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED); // Previous attempts still fail
            }
        }
    }, 15000); // Increase timeout for rate limit test
  });
});
```
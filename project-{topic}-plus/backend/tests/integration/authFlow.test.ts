import request from 'supertest';
import { app } from '../../src/app'; // Import the Express app
import { AppDataSource } from '../../src/db/data-source';
import { User, UserRole } from '../../src/entities/User';
import * as bcrypt from 'bcryptjs';
import { LoggerService } from '../../src/utils/logger';

const logger = LoggerService.getLogger();

describe('Authentication Flow (Integration Tests)', () => {
  let adminUser: User;
  let regularUser: User;

  beforeAll(async () => {
    // Ensure DB is initialized and empty for clean state
    await AppDataSource.synchronize(true); // Clear and re-create tables for integration tests
    logger.info("Integration test: DB synchronized (cleared)");

    // Create a known admin user
    adminUser = AppDataSource.getRepository(User).create({
      username: 'admin_test',
      email: 'admin_test@example.com',
      password_hash: await bcrypt.hash('adminpassword', 10),
      role: UserRole.ADMIN,
    });
    await AppDataSource.getRepository(User).save(adminUser);

    // Create a known regular user
    regularUser = AppDataSource.getRepository(User).create({
      username: 'user_test',
      email: 'user_test@example.com',
      password_hash: await bcrypt.hash('userpassword', 10),
      role: UserRole.USER,
    });
    await AppDataSource.getRepository(User).save(regularUser);

    logger.info("Integration test: Users created.");
  });

  afterAll(async () => {
    // Clean up created users
    if (adminUser) await AppDataSource.getRepository(User).remove(adminUser);
    if (regularUser) await AppDataSource.getRepository(User).remove(regularUser);
    logger.info("Integration test: Users cleaned up.");
    await AppDataSource.destroy(); // Close DB connection
  });

  it('should allow a new user to register', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'securepassword123',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.user.role).toBe(UserRole.USER); // Default role
  });

  it('should prevent registration with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: 'duplicate@example.com',
        password: 'password123',
      });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'yetanother',
        email: 'duplicate@example.com',
        password: 'password456',
      });

    expect(response.statusCode).toBe(409); // Conflict
    expect(response.body.message).toContain('Email already in use');
  });

  it('should allow an existing user to login and receive a token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: regularUser.email,
        password: 'userpassword',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe(regularUser.email);
  });

  it('should reject login with incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: regularUser.email,
        password: 'wrongpassword',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should reject login with non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });
});
```

#### `backend/tests/api/users.test.ts` (Example API Test)
```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/data-source';
import { User, UserRole } from '../../src/entities/User';
import { UserRepository } from '../../src/repositories/UserRepository';
import httpStatus from 'http-status';
import { generateToken } from '../../src/utils/jwt';

describe('Auth routes', () => {
  let newUser: User;
  let adminUser: User;
  let adminToken: string;

  beforeEach(async () => {
    // Create a regular user for tests
    const userData = UserRepository.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.USER,
    });
    newUser = await UserRepository.save(userData);

    // Create an admin user for tests
    const adminData = UserRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'adminpassword',
      role: UserRole.ADMIN,
    });
    adminUser = await UserRepository.save(adminData);
    adminToken = generateToken(adminUser.id, adminUser.email, adminUser.role);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'New',
          lastName: 'Guy',
          email: 'newguy@example.com',
          password: 'newpassword123',
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email', 'newguy@example.com');
      expect(res.body.user).not.toHaveProperty('password'); // Password should not be returned
      expect(res.body).toHaveProperty('token');

      const userInDb = await UserRepository.findByEmail('newguy@example.com');
      expect(userInDb).toBeDefined();
      expect(userInDb?.email).toBe('newguy@example.com');
    });

    it('should return 400 if email is already taken', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Existing',
          lastName: 'User',
          email: 'test@example.com', // Already taken
          password: 'password123',
        })
        .expect(httpStatus.CONFLICT);
    });

    it('should return 400 if validation fails', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Bad',
          email: 'bademail', // Invalid email
          password: 'pass', // Too short
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in an existing user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: newUser.email,
          password: 'password123',
        })
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', newUser.id);
      expect(res.body.user).toHaveProperty('email', newUser.email);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 401 for incorrect password', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: newUser.email,
          password: 'wrongpassword',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 for unregistered email', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the authenticated user', async () => {
      const userToken = generateToken(newUser.id, newUser.email, newUser.role);
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', newUser.id);
      expect(res.body.user).toHaveProperty('email', newUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 if no token provided', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 if invalid token provided', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 if token is expired', async () => {
      // Generate a token that expires instantly (or in the past) for testing
      const expiredToken = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, config.jwt.secret, { expiresIn: '1s' });
      // Wait for the token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
```
*Note*: `jwt` and `config` imports will need to be added to `auth.test.ts` for the expired token test to work.

#### Frontend Tests (`frontend/src/tests`)

**`frontend/src/tests/App.test.tsx`** (Basic App rendering test)
```typescript
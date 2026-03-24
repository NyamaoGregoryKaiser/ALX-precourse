```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { Connection } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/enums/user-role.enum';
import { v4 as uuid } from 'uuid';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminUser: User;
  let regularUser: User;
  let adminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = app.get(Connection);
    await connection.synchronize(true); // Recreates schema from entities

    const usersRepository = connection.getRepository(User);

    // Create an admin user
    const hashedPassword = await bcrypt.hash('AdminPass1!', 10);
    adminUser = await usersRepository.save({
      id: uuid(),
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      roles: [UserRole.ADMIN, UserRole.USER],
    });

    // Create a regular user
    const regularHashedPassword = await bcrypt.hash('UserPass1!', 10);
    regularUser = await usersRepository.save({
      id: uuid(),
      firstName: 'Test',
      lastName: 'User',
      email: 'user@test.com',
      password: regularHashedPassword,
      roles: [UserRole.USER],
    });

    // Log in admin to get token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass1!' });
    adminToken = adminLoginResponse.body.access_token;

    // Log in regular user to get token
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'UserPass1!' });
    regularUserToken = userLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const newUserEmail = `newuser${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: newUserEmail,
          password: 'NewUser123!',
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.email).toBe(newUserEmail);
      expect(response.body.roles).toEqual([UserRole.USER]);
      expect(response.body.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 400 if email already exists', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          firstName: 'Existing',
          lastName: 'User',
          email: 'admin@test.com', // Using existing email
          password: 'Password123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('User with this email already exists');
        });
    });

    it('should return 400 for invalid input', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          firstName: 'Short',
          lastName: 'Name',
          email: 'invalid-email', // Invalid email format
          password: '123', // Too short password
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login an existing user and return a JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'AdminPass1!' })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('admin@test.com');
      expect(response.body.user.roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });
  });

  describe('/users/profile (GET) - Protected Route', () => {
    it('should return the authenticated user\'s profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(adminUser.id);
      expect(response.body.email).toBe(adminUser.email);
      expect(response.body.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 401 if no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });

    it('should return 401 if an invalid token is provided', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(401);
    });
  });

  describe('/users/:id (GET) - Admin Only', () => {
    it('should allow admin to get any user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(regularUser.id);
      expect(response.body.email).toBe(regularUser.email);
    });

    it('should forbid regular user from getting another user by ID', async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should return 404 if user not found', async () => {
      await request(app.getHttpServer())
        .get(`/users/${uuid()}`) // Non-existent ID
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/projects (POST) - Authenticated User', () => {
    it('should allow a regular user to create a project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ name: 'User Project 1', description: 'A project by regular user.' })
        .expect(201);

      expect(response.body.name).toBe('User Project 1');
      expect(response.body.owner.id).toBe(regularUser.id);
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Public Project' })
        .expect(401);
    });
  });
});
```
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { LoggerService } from '../src/utils/logger';
import { UserRole } from '../src/users/enums/user-role.enum';
import { TaskStatus } from '../src/tasks/enums/task-status.enum';

/**
 * End-to-End (E2E) tests for the Task Management Backend API.
 * These tests cover the main API flows, including authentication,
 * user management, project management, and task management.
 * They interact with the actual application setup (including a test database)
 * to ensure all components work together correctly.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let configService: ConfigService;
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let userUserId: string;
  let projectId: string;
  let taskId: string;

  // Before all tests, initialize the NestJS application and database
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService);
    dataSource = app.get(DataSource);
    const logger = app.get(LoggerService);
    app.useLogger(logger); // Ensure custom logger is used

    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // Set global API prefix if defined in config
    const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
    app.setGlobalPrefix(apiPrefix);

    await app.init();

    // Clear and seed the database for testing purposes
    await seedDatabase(dataSource);

    // Register and login a test admin user
    const adminRegisterRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        username: 'e2e_admin',
        email: 'e2e_admin@test.com',
        password: 'AdminPassword123!',
      });
    expect(adminRegisterRes.statusCode).toBe(201);

    const adminLoginRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        username: 'e2e_admin',
        password: 'AdminPassword123!',
      });
    expect(adminLoginRes.statusCode).toBe(200);
    adminToken = adminLoginRes.body.access_token;

    // Get admin user ID
    const adminProfileRes = await request(app.getHttpServer())
      .get(`/${apiPrefix}/auth/profile`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminProfileRes.statusCode).toBe(200);
    adminUserId = adminProfileRes.body.id;

    // Update admin user to have ADMIN role
    await request(app.getHttpServer())
      .patch(`/${apiPrefix}/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roles: [UserRole.ADMIN, UserRole.USER],
      });

    // Register and login a test regular user
    const userRegisterRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/register`)
      .send({
        username: 'e2e_user',
        email: 'e2e_user@test.com',
        password: 'UserPassword123!',
      });
    expect(userRegisterRes.statusCode).toBe(201);

    const userLoginRes = await request(app.getHttpServer())
      .post(`/${apiPrefix}/auth/login`)
      .send({
        username: 'e2e_user',
        password: 'UserPassword123!',
      });
    expect(userLoginRes.statusCode).toBe(200);
    userToken = userLoginRes.body.access_token;

    // Get regular user ID
    const userProfileRes = await request(app.getHttpServer())
      .get(`/${apiPrefix}/auth/profile`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(userProfileRes.statusCode).toBe(200);
    userUserId = userProfileRes.body.id;
  });

  // After all tests, close the application and clear the database
  afterAll(async () => {
    await clearDatabase(dataSource);
    await app.close();
  });

  // Helper function to clear database tables
  async function clearDatabase(ds: DataSource) {
    const entities = ds.entityMetadatas;
    for (const entity of entities) {
      const repository = ds.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
  }

  // Helper function to seed database (only for initial setup, actual seeding done in beforeAll)
  async function seedDatabase(ds: DataSource) {
    // In a real scenario, you might have specific test seed data here.
    // For this E2E, we simply clear and let the auth process create users.
    await clearDatabase(ds);
  }

  it('/ (GET) - Health Check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Welcome to Task Management API!');
  });

  describe('Auth Flow', () => {
    it('/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post(`/${configService.get('API_PREFIX')}/auth/register`)
        .send({
          username: 'test_register',
          email: 'test_register@example.com',
          password: 'TestPassword123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username', 'test_register');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('/auth/login (POST) - should login a user and return JWT', async () => {
      const response = await request(app.getHttpServer())
        .post(`/${configService.get('API_PREFIX')}/auth/login`)
        .send({
          username: 'test_register',
          password: 'TestPassword123!',
        })
        .expect(200);
      expect(response.body).toHaveProperty('access_token');
    });

    it('/auth/profile (GET) - should return authenticated user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/auth/profile`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body).toHaveProperty('id', userUserId);
      expect(response.body).toHaveProperty('username', 'e2e_user');
    });

    it('/auth/profile (GET) - should return 401 for unauthenticated request', () => {
      return request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/auth/profile`)
        .expect(401);
    });
  });

  describe('Users Module (Admin Only)', () => {
    it('/users (GET) - should return all users for Admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2); // admin, user, test_register
      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('/users (GET) - should return 403 for regular user', () => {
      return request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('/users/:id (PATCH) - should update a user for Admin', async () => {
      const updatedUsername = 'e2e_admin_updated';
      const response = await request(app.getHttpServer())
        .patch(`/${configService.get('API_PREFIX')}/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: updatedUsername })
        .expect(200);
      expect(response.body).toHaveProperty('username', updatedUsername);
    });
  });

  describe('Projects Module', () => {
    it('/projects (POST) - should create a new project for regular user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/${configService.get('API_PREFIX')}/projects`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'E2E Test Project', description: 'A project for e2e testing.' })
        .expect(201);
      expect(response.body).toHaveProperty('name', 'E2E Test Project');
      expect(response.body).toHaveProperty('ownerId', userUserId);
      projectId = response.body.id;
    });

    it('/projects (GET) - should return user-owned projects for regular user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/projects`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('id', projectId);
    });

    it('/projects/:id (GET) - should return a project by ID for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body).toHaveProperty('id', projectId);
    });

    it('/projects/:id (GET) - should return 403 for non-owner/non-admin', async () => {
      // Create another project by admin
      const adminProjectRes = await request(app.getHttpServer())
        .post(`/${configService.get('API_PREFIX')}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Project', description: 'Owned by admin.' });
      expect(adminProjectRes.statusCode).toBe(201);
      const adminProjectId = adminProjectRes.body.id;

      return request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/projects/${adminProjectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403); // Regular user cannot access admin's project
    });

    it('/projects/:id (PATCH) - should update a project for owner', async () => {
      const updatedName = 'Updated E2E Project';
      const response = await request(app.getHttpServer())
        .patch(`/${configService.get('API_PREFIX')}/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: updatedName })
        .expect(200);
      expect(response.body).toHaveProperty('name', updatedName);
    });
  });

  describe('Tasks Module', () => {
    it('/tasks (POST) - should create a new task for a project owner', async () => {
      const response = await request(app.getHttpServer())
        .post(`/${configService.get('API_PREFIX')}/tasks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'E2E Test Task',
          projectId: projectId,
          status: TaskStatus.TODO,
          priority: 1,
        })
        .expect(201);
      expect(response.body).toHaveProperty('title', 'E2E Test Task');
      expect(response.body).toHaveProperty('projectId', projectId);
      expect(response.body).toHaveProperty('assignedToId', userUserId); // Defaults to project owner
      taskId = response.body.id;
    });

    it('/tasks (GET) - should return user-accessible tasks', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/tasks`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('id', taskId);
    });

    it('/tasks/:id (GET) - should return a task by ID for owner/assigned', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body).toHaveProperty('id', taskId);
    });

    it('/tasks/:id (PATCH) - should update a task for owner/assigned', async () => {
      const updatedStatus = TaskStatus.IN_PROGRESS;
      const response = await request(app.getHttpServer())
        .patch(`/${configService.get('API_PREFIX')}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: updatedStatus })
        .expect(200);
      expect(response.body).toHaveProperty('status', updatedStatus);
    });

    it('/tasks/:id (DELETE) - should delete a task for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/${configService.get('API_PREFIX')}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404); // Task should no longer exist
    });
  });

  describe('Cleanup - Projects', () => {
    it('/projects/:id (DELETE) - should delete a project for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/${configService.get('API_PREFIX')}/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/${configService.get('API_PREFIX')}/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404); // Project should no longer exist
    });
  });
});
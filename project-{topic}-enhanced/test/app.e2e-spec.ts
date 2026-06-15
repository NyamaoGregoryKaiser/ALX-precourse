```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { AuthCredentialsDto } from '../src/auth/dto/auth-credentials.dto';
import { CreateCategoryDto } from '../src/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../src/categories/dto/update-category.dto';
import { CreateTaskDto } from '../src/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../src/tasks/dto/update-task.dto';
import { TaskStatus } from '../src/tasks/enum/task-status.enum';
import { TaskPriority } from '../src/tasks/enum/task-priority.enum';
import { clearDatabase, runMigrations } from './setup-e2e';
import { AccessTokenDto } from '../src/auth/dto/access-token.dto';
import { CustomLogger } from '../src/common/logger/custom-logger'; // Import custom logger

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: number; // To store the ID of the test user
  let categoryId: number; // To store the ID of a test category
  let taskId: number; // To store the ID of a test task

  const testUser: AuthCredentialsDto = {
    username: 'e2euser',
    password: 'e2ePassword123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CustomLogger) // Override custom logger to suppress logs in tests
      .useValue({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    await clearDatabase(dataSource);
    await runMigrations(dataSource);
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  describe('Auth Flow', () => {
    it('/auth/signup (POST) - should register a new user and return an access token', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          accessToken = res.body.accessToken;
        });
    });

    it('/auth/signin (POST) - should login the user and return an access token', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send(testUser)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          accessToken = res.body.accessToken;
        });
    });

    it('/auth/signup (POST) - should return 409 Conflict if username already exists', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toContain('Username already exists');
        });
    });

    it('/auth/signin (POST) - should return 401 Unauthorized for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({ username: 'nonexistent', password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.message).toContain('credentials');
        });
    });
  });

  describe('User Profile', () => {
    beforeAll(async () => {
      // Get the user ID after login
      const user = await dataSource.getRepository('users').findOne({
        where: { username: testUser.username },
      });
      userId = user.id;
    });

    it('/users/profile (GET) - should retrieve authenticated user profile', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('username', testUser.username);
          expect(res.body).not.toHaveProperty('password'); // Password should not be returned
        });
    });

    it('/users/profile (PATCH) - should update user profile (username)', () => {
      const newUsername = 'e2euser_updated';
      return request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: newUsername })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('username', newUsername);
          testUser.username = newUsername; // Update test user credentials
        });
    });

    it('/users/profile (PATCH) - should return 409 Conflict for existing username', () => {
      // Create another user
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ username: 'anotheruser', password: 'password123' })
        .expect(HttpStatus.CREATED)
        .then(() => {
          // Try to update e2euser_updated to 'anotheruser'
          return request(app.getHttpServer())
            .patch('/users/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ username: 'anotheruser' })
            .expect(HttpStatus.CONFLICT)
            .expect((res) => {
              expect(res.body.message).toContain('Username "anotheruser" already exists');
            });
        });
    });

    it('/users/profile (PATCH) - should update user profile (password)', async () => {
      const newPassword = 'newE2ePassword123';
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: newPassword })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('username', testUser.username); // Username unchanged
          expect(res.body).not.toHaveProperty('password');
        });

      // Verify new password by logging in again
      const loginRes = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ username: testUser.username, password: newPassword })
        .expect(HttpStatus.OK);
      expect(loginRes.body).toHaveProperty('accessToken');
      accessToken = loginRes.body.accessToken; // Update accessToken
      testUser.password = newPassword; // Update test user credentials
    });
  });

  describe('Categories Flow', () => {
    it('/categories (POST) - should create a new category', () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Work',
        description: 'Work related tasks',
      };
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createCategoryDto)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', createCategoryDto.name);
          categoryId = res.body.id;
        });
    });

    it('/categories (POST) - should return 409 Conflict if category name already exists for user', () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Work', // Duplicate name for the same user
        description: 'Another description',
      };
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createCategoryDto)
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toContain('Category with name "Work" already exists');
        });
    });

    it('/categories (GET) - should retrieve all categories for the user', () => {
      return request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('name', 'Work');
        });
    });

    it('/categories?name=Work (GET) - should retrieve categories filtered by name', () => {
      return request(app.getHttpServer())
        .get('/categories?name=Work')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toEqual(1);
          expect(res.body[0]).toHaveProperty('name', 'Work');
        });
    });

    it('/categories/:id (GET) - should retrieve a single category by ID', () => {
      return request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', categoryId);
          expect(res.body).toHaveProperty('name', 'Work');
        });
    });

    it('/categories/:id (GET) - should return 404 Not Found for non-existent category', () => {
      return request(app.getHttpServer())
        .get('/categories/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/categories/:id (PATCH) - should update a category', () => {
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Work',
        description: 'Updated description',
      };
      return request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateCategoryDto)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', categoryId);
          expect(res.body).toHaveProperty('name', updateCategoryDto.name);
          expect(res.body).toHaveProperty('description', updateCategoryDto.description);
        });
    });

    it('/categories/:id (PATCH) - should return 409 Conflict if updating to an existing category name', async () => {
      // Create another category
      const createAnotherCategoryDto: CreateCategoryDto = {
        name: 'Personal',
        description: 'Personal tasks',
      };
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createAnotherCategoryDto)
        .expect(HttpStatus.CREATED);

      // Try to update "Updated Work" to "Personal"
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Personal',
      };
      return request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateCategoryDto)
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Category with name "Personal" already exists',
          );
        });
    });
  });

  describe('Tasks Flow', () => {
    it('/tasks (POST) - should create a new task with a category', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Complete E2E tests',
        description: 'Ensure all endpoints are covered with E2E tests.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        categoryId: categoryId,
      };
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('title', createTaskDto.title);
          expect(res.body.category).toHaveProperty('id', categoryId);
          expect(res.body.status).toEqual(TaskStatus.IN_PROGRESS);
          expect(res.body.priority).toEqual(TaskPriority.HIGH);
          taskId = res.body.id;
        });
    });

    it('/tasks (POST) - should create a new task without a category', () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Walk the dog',
        status: TaskStatus.OPEN,
      };
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('title', createTaskDto.title);
          expect(res.body.category).toBeNull();
        });
    });

    it('/tasks (POST) - should return 404 if categoryId does not exist', () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Invalid Category Task',
        categoryId: 99999,
      };
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/tasks (GET) - should retrieve all tasks for the user', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('title');
          expect(res.body[0]).toHaveProperty('category'); // Ensure category is eagerly loaded
        });
    });

    it('/tasks?status=IN_PROGRESS (GET) - should filter tasks by status', () => {
      return request(app.getHttpServer())
        .get(`/tasks?status=${TaskStatus.IN_PROGRESS}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.every((task) => task.status === TaskStatus.IN_PROGRESS)).toBe(
            true,
          );
        });
    });

    it('/tasks?priority=HIGH (GET) - should filter tasks by priority', () => {
      return request(app.getHttpServer())
        .get(`/tasks?priority=${TaskPriority.HIGH}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.every((task) => task.priority === TaskPriority.HIGH)).toBe(
            true,
          );
        });
    });

    it(`/tasks?categoryId=${categoryId} (GET) - should filter tasks by category ID`, () => {
      return request(app.getHttpServer())
        .get(`/tasks?categoryId=${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.every((task) => task.category?.id === categoryId)).toBe(true);
        });
    });

    it('/tasks?search=tests (GET) - should filter tasks by search term in title/description', () => {
      return request(app.getHttpServer())
        .get('/tasks?search=tests')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(
            res.body.every(
              (task) =>
                task.title.toLowerCase().includes('tests') ||
                task.description.toLowerCase().includes('tests'),
            ),
          ).toBe(true);
        });
    });

    it('/tasks/:id (GET) - should retrieve a single task by ID', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', taskId);
          expect(res.body).toHaveProperty('title', 'Complete E2E tests');
          expect(res.body.category).toHaveProperty('id', categoryId);
        });
    });

    it('/tasks/:id (GET) - should return 404 Not Found for non-existent task', () => {
      return request(app.getHttpServer())
        .get('/tasks/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('/tasks/:id (PATCH) - should update a task (status, priority, description)', () => {
      const updateTaskDto: UpdateTaskDto = {
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        description: 'E2E tests are complete and passed.',
      };
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateTaskDto)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', taskId);
          expect(res.body).toHaveProperty('status', TaskStatus.DONE);
          expect(res.body).toHaveProperty('priority', TaskPriority.LOW);
          expect(res.body).toHaveProperty('description', updateTaskDto.description);
        });
    });

    it('/tasks/:id (PATCH) - should unassign category (categoryId: null)', () => {
      const updateTaskDto: UpdateTaskDto = { categoryId: null };
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateTaskDto)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', taskId);
          expect(res.body.category).toBeNull();
        });
    });

    it('/tasks/:id (PATCH) - should return 400 Bad Request for invalid status', () => {
      const updateTaskDto: UpdateTaskDto = { status: 'INVALID_STATUS' as TaskStatus };
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateTaskDto)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid status');
        });
    });
  });

  describe('Authorization Checks', () => {
    let unauthorizedAccessToken: string;
    let unauthorizedCategoryId: number;
    let unauthorizedTaskId: number;

    beforeAll(async () => {
      // Register a second user
      const anotherUser: AuthCredentialsDto = {
        username: 'unauthuser',
        password: 'unauthpassword',
      };
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(anotherUser)
        .expect(HttpStatus.CREATED);
      unauthorizedAccessToken = signupRes.body.accessToken;

      // Create a category for the second user
      const createCategoryDto: CreateCategoryDto = {
        name: 'Unauth Category',
        description: 'Category for unauthorized user',
      };
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${unauthorizedAccessToken}`)
        .send(createCategoryDto)
        .expect(HttpStatus.CREATED);
      unauthorizedCategoryId = categoryRes.body.id;

      // Create a task for the second user
      const createTaskDto: CreateTaskDto = {
        title: 'Unauth Task',
        status: TaskStatus.OPEN,
        categoryId: unauthorizedCategoryId,
      };
      const taskRes = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${unauthorizedAccessToken}`)
        .send(createTaskDto)
        .expect(HttpStatus.CREATED);
      unauthorizedTaskId = taskRes.body.id;
    });

    it('should return 401 Unauthorized for unprotected routes without token', () => {
      return request(app.getHttpServer())
        .get('/users/profile') // Protected route
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 Unauthorized for invalid token', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer invalidtoken123`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 Not Found when trying to access another user\'s category', () => {
      return request(app.getHttpServer())
        .get(`/categories/${unauthorizedCategoryId}`)
        .set('Authorization', `Bearer ${accessToken}`) // Main user trying to access other user's category
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 Not Found when trying to access another user\'s task', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${unauthorizedTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`) // Main user trying to access other user's task
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 Not Found when trying to update another user\'s category', () => {
      return request(app.getHttpServer())
        .patch(`/categories/${unauthorizedCategoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Malicious Update' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 Not Found when trying to delete another user\'s task', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${unauthorizedTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests up to the limit', async () => {
      const limit = 10; // Default limit from .env.example
      for (let i = 0; i < limit; i++) {
        await request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(HttpStatus.OK);
      }
    });

    it('should return 429 Too Many Requests when limit is exceeded', async () => {
      // One more request after hitting the limit
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.TOO_MANY_REQUESTS)
        .expect((res) => {
          expect(res.body.message).toContain('ThrottlerException: Too Many Requests');
        });
    });
  });

  describe('Cleanup', () => {
    it('/tasks/:id (DELETE) - should delete a task', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('/categories/:id (DELETE) - should delete a category', () => {
      // Using the updated categoryId from 'Updated Work'
      return request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});
```
```javascript
const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/config/db');
const { clearDatabase, createTestUser } = require('../fixtures/authFixtures');
const { signToken } = require('../../src/utils/jwt');
const { TaskStatus, TaskPriority } = require('@prisma/client');

describe('Task Controller Integration Tests', () => {
  let regularUser, regularToken;
  let category1, category2;
  let task1, task2;

  beforeAll(async () => {
    await clearDatabase();
    regularUser = await createTestUser({ email: 'usertask@test.com', username: 'usertask' });
    regularToken = signToken(regularUser.id);

    category1 = await prisma.category.create({
      data: { name: 'Work', userId: regularUser.id },
    });
    category2 = await prisma.category.create({
      data: { name: 'Home', userId: regularUser.id },
    });
  });

  beforeEach(async () => {
    // Clear tasks for the current user before each test to ensure isolation
    await prisma.task.deleteMany({ where: { userId: regularUser.id } });

    task1 = await prisma.task.create({
      data: {
        title: 'Finish report',
        description: 'Finalize the Q2 report',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        userId: regularUser.id,
        categoryId: category1.id,
      },
    });
    task2 = await prisma.task.create({
      data: {
        title: 'Buy groceries',
        description: 'Milk, eggs, bread',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        userId: regularUser.id,
        categoryId: category2.id,
      },
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task for the authenticated user', async () => {
      const newTaskData = {
        title: 'Workout',
        description: 'Go to the gym',
        status: 'PENDING',
        priority: 'LOW',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        categoryId: category2.id,
      };

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(newTaskData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.task.title).toEqual(newTaskData.title);
      expect(res.body.data.task.userId).toEqual(regularUser.id);
      expect(res.body.data.task.categoryId).toEqual(category2.id);

      const taskInDb = await prisma.task.findUnique({ where: { id: res.body.data.task.id } });
      expect(taskInDb).not.toBeNull();
      expect(taskInDb.title).toEqual(newTaskData.title);
    });

    it('should create a task without a category', async () => {
      const newTaskData = {
        title: 'Read a book',
        status: 'PENDING',
      };

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(newTaskData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.task.title).toEqual(newTaskData.title);
      expect(res.body.data.task.categoryId).toBeNull();
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ description: 'some description' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"title" is required');
    });

    it('should return 404 if categoryId is provided but not found for user', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com', username: 'otherusertask' });
      const otherCategory = await prisma.category.create({
        data: { name: 'Other Category', userId: otherUser.id },
      });

      const newTaskData = {
        title: 'Task with invalid category',
        categoryId: otherCategory.id,
      };

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(newTaskData);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Category not found.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Guest Task' });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should get all tasks for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.tasks).toHaveLength(2);
      expect(res.body.data.tasks.map(t => t.title)).toEqual(expect.arrayContaining([task1.title, task2.title]));
      expect(res.body.data.tasks.every(t => t.userId === regularUser.id)).toBe(true);
      // Check if category is included
      expect(res.body.data.tasks[0]).toHaveProperty('category');
      expect(res.body.data.tasks[0].category).toHaveProperty('name');
    });

    it('should filter tasks by status', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks?status=${TaskStatus.PENDING}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.data.tasks[0].title).toEqual(task1.title);
    });

    it('should filter tasks by categoryId', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks?categoryId=${category2.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.data.tasks[0].title).toEqual(task2.title);
    });

    it('should paginate tasks', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=1')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.total).toEqual(2);
    });

    it('should sort tasks by dueDate descending', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?sort=-dueDate')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.tasks[0].id).toEqual(task1.id); // task1 has later due date
      expect(res.body.data.tasks[1].id).toEqual(task2.id);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get a specific task for the authenticated user', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.task.id).toEqual(task1.id);
      expect(res.body.data.task.title).toEqual(task1.title);
      expect(res.body.data.task.userId).toEqual(regularUser.id);
      expect(res.body.data.task).toHaveProperty('category');
      expect(res.body.data.task.category.name).toEqual(category1.name);
    });

    it('should return 404 if task not found or does not belong to user', async () => {
      const otherUser = await createTestUser({ email: 'other2@test.com', username: 'otherusertask2' });
      const otherTask = await prisma.task.create({
        data: { title: 'Other User Task', userId: otherUser.id },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${otherTask.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Task not found.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/v1/tasks/${task1.id}`);
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update a task for the authenticated user', async () => {
      const newTitle = 'Updated Report Title';
      const res = await request(app)
        .patch(`/api/v1/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: newTitle, status: 'COMPLETED' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.task.id).toEqual(task1.id);
      expect(res.body.data.task.title).toEqual(newTitle);
      expect(res.body.data.task.status).toEqual('COMPLETED');

      const taskInDb = await prisma.task.findUnique({ where: { id: task1.id } });
      expect(taskInDb.title).toEqual(newTitle);
      expect(taskInDb.status).toEqual('COMPLETED');
    });

    it('should allow changing category to another valid category', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ categoryId: category2.id });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.task.categoryId).toEqual(category2.id);

      const taskInDb = await prisma.task.findUnique({ where: { id: task1.id } });
      expect(taskInDb.categoryId).toEqual(category2.id);
    });

    it('should allow unsetting category by setting categoryId to null', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ categoryId: null });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.task.categoryId).toBeNull();

      const taskInDb = await prisma.task.findUnique({ where: { id: task1.id } });
      expect(taskInDb.categoryId).toBeNull();
    });

    it('should return 404 if new categoryId is invalid or not owned by user', async () => {
      const otherUser = await createTestUser({ email: 'other3@test.com', username: 'otherusertask3' });
      const otherCategory = await prisma.category.create({
        data: { name: 'Other User Category 2', userId: otherUser.id },
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ categoryId: otherCategory.id });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Category not found.');
    });

    it('should return 404 if task not found or does not belong to user', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Nonexistent' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Task not found.');
    });

    it('should return 400 for invalid status enum value', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"status" must be one of [PENDING, IN_PROGRESS, COMPLETED]');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task for the authenticated user', async () => {
      const taskToDelete = await prisma.task.create({
        data: { title: 'Task to Delete', userId: regularUser.id },
      });

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskToDelete.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body).toEqual({});

      const taskInDb = await prisma.task.findUnique({ where: { id: taskToDelete.id } });
      expect(taskInDb).toBeNull();
    });

    it('should return 404 if task not found or does not belong to user', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Task not found.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete(`/api/v1/tasks/${task1.id}`);
      expect(res.statusCode).toEqual(401);
    });
  });
});
```
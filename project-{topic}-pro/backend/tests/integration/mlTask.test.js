const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Project, MLTask } = require('../../src/db/sequelize');
const { generateToken } = require('../../src/utils/jwt');
const bcrypt = require('bcryptjs');
const { redisClient } = require('../../src/utils/redisClient'); // Import redis client

describe('MLTask API', () => {
  let user1, user2, project1, project2, token1, token2;
  const userPassword = 'Password123!';

  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Clean DB for integration tests
    await redisClient.connect(); // Ensure Redis client is connected
  });

  beforeEach(async () => {
    await User.destroy({ truncate: true, cascade: true });
    await Project.destroy({ truncate: true, cascade: true });
    await MLTask.destroy({ truncate: true, cascade: true });
    await redisClient.flushdb(); // Clear Redis cache before each test

    user1 = await User.create({
      username: 'user1',
      email: 'user1@example.com',
      passwordHash: userPassword,
    });
    user2 = await User.create({
      username: 'user2',
      email: 'user2@example.com',
      passwordHash: userPassword,
    });

    project1 = await Project.create({
      name: 'Project 1 by User 1',
      userId: user1.id,
    });
    project2 = await Project.create({
      name: 'Project 2 by User 2',
      userId: user2.id,
    });

    token1 = generateToken(user1.id);
    token2 = generateToken(user2.id);
  });

  afterAll(async () => {
    await sequelize.close();
    await redisClient.quit();
  });

  // Helper function to create an ML Task
  const createMLTask = async (projectId, token, taskType, inputData, parameters) => {
    return request(app)
      .post(`/api/projects/${projectId}/ml-tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: taskType, inputData, parameters });
  };

  describe('GET /api/projects/:projectId/ml-tasks', () => {
    it('should return all ML tasks for a project owned by the user', async () => {
      await createMLTask(project1.id, token1, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      await createMLTask(project1.id, token1, 'standardization', { data: [{ b: 2 }] }, { column: 'b' });

      const res = await request(app)
        .get(`/api/projects/${project1.id}/ml-tasks`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(2);
      expect(res.body.data.mlTasks.length).toBe(2);
      expect(res.body.data.mlTasks[0].projectId).toBe(project1.id);
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const res = await request(app)
        .get(`/api/projects/${project2.id}/ml-tasks`) // Project 2 owned by User 2
        .set('Authorization', `Bearer ${token1}`); // Accessed by User 1

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to access it.');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get(`/api/projects/${project1.id}/ml-tasks`);

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('POST /api/projects/:projectId/ml-tasks', () => {
    it('should create and execute a min_max_scaling task successfully', async () => {
      const inputData = { data: [{ value: 10 }, { value: 20 }, { value: 30 }] };
      const parameters = { column: 'value' };

      const res = await createMLTask(project1.id, token1, 'min_max_scaling', inputData, parameters);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.mlTask).toBeDefined();
      expect(res.body.data.mlTask.type).toBe('min_max_scaling');
      expect(res.body.data.mlTask.status).toBe('completed');
      expect(res.body.data.mlTask.outputData.scaled_data).toEqual([{ value: 0 }, { value: 0.5 }, { value: 1 }]);
      expect(res.body.data.mlTask.projectId).toBe(project1.id);

      const mlTaskInDb = await MLTask.findByPk(res.body.data.mlTask.id);
      expect(mlTaskInDb).not.toBeNull();
    });

    it('should create and execute an accuracy_score task successfully', async () => {
      const inputData = { y_true: [0, 1, 0, 1], y_pred: [0, 1, 1, 1] };
      const parameters = {};

      const res = await createMLTask(project1.id, token1, 'accuracy_score', inputData, parameters);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.mlTask.type).toBe('accuracy_score');
      expect(res.body.data.mlTask.status).toBe('completed');
      expect(res.body.data.mlTask.outputData.score).toBe(0.75);
    });

    it('should return 400 for unsupported ML task type', async () => {
      const inputData = { data: [{ a: 1 }] };
      const parameters = { column: 'a' };

      const res = await createMLTask(project1.id, token1, 'unsupported_task', inputData, parameters);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Unsupported ML task type');
    });

    it('should return 400 for invalid input data/parameters for a task', async () => {
      const inputData = { invalid_key: 1 }; // Missing 'data' for scaling
      const parameters = { column: 'value' };

      const res = await createMLTask(project1.id, token1, 'min_max_scaling', inputData, parameters);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Input data must be an array.');
    });

    it('should set task status to failed if execution logic throws an error', async () => {
      const inputData = { data: [{ value: 'not-a-number' }] }; // Invalid data for numerical scaling
      const parameters = { column: 'value' };

      const res = await createMLTask(project1.id, token1, 'min_max_scaling', inputData, parameters);

      expect(res.statusCode).toEqual(201); // Task creation is successful, but execution failed
      expect(res.body.status).toBe('success');
      expect(res.body.data.mlTask.status).toBe('failed');
      expect(res.body.data.mlTask.outputData.error).toBeDefined();
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const res = await createMLTask(project2.id, token1, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to access it.');
    });
  });

  describe('GET /api/projects/:projectId/ml-tasks/:taskId', () => {
    let mlTask;

    beforeEach(async () => {
      const res = await createMLTask(project1.id, token1, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      mlTask = res.body.data.mlTask;
    });

    it('should return a specific ML task by ID if owned by the user', async () => {
      const res = await request(app)
        .get(`/api/projects/${project1.id}/ml-tasks/${mlTask.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.mlTask.id).toBe(mlTask.id);
      expect(res.body.data.mlTask.projectId).toBe(project1.id);
    });

    it('should return 404 if ML task not found or not owned by user', async () => {
      const res = await request(app)
        .get(`/api/projects/${project1.id}/ml-tasks/${project2.id}`) // Invalid taskId
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('ML Task not found.');
    });

    it('should return 404 if project is not owned by user', async () => {
      const res = await request(app)
        .get(`/api/projects/${project2.id}/ml-tasks/${mlTask.id}`) // Project 2, ML Task from Project 1
        .set('Authorization', `Bearer ${token2}`); // User 2 trying to access user 1's project/task

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('ML Task not found.');
    });
  });

  describe('DELETE /api/projects/:projectId/ml-tasks/:taskId', () => {
    let mlTaskToDelete;

    beforeEach(async () => {
      const res = await createMLTask(project1.id, token1, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      mlTaskToDelete = res.body.data.mlTask;
    });

    it('should delete an ML task successfully if owned by the user', async () => {
      const res = await request(app)
        .delete(`/api/projects/${project1.id}/ml-tasks/${mlTaskToDelete.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body.status).toBeUndefined(); // 204 No Content typically has no body

      const mlTaskInDb = await MLTask.findByPk(mlTaskToDelete.id);
      expect(mlTaskInDb).toBeNull();
    });

    it('should return 404 if ML task not found or not owned by user', async () => {
      const res = await request(app)
        .delete(`/api/projects/${project1.id}/ml-tasks/${project2.id}`) // Invalid taskId
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('ML Task not found or you do not have permission to delete it.');
    });

    it('should return 404 if project is not owned by user', async () => {
      const res = await request(app)
        .delete(`/api/projects/${project2.id}/ml-tasks/${mlTaskToDelete.id}`) // Project 2, ML Task from Project 1
        .set('Authorization', `Bearer ${token2}`); // User 2 trying to delete user 1's project/task

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('ML Task not found or you do not have permission to delete it.');
    });
  });
});
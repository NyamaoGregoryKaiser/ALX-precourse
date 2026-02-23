```javascript
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Project = require('../../src/models/Project');
const Task = require('../../src/models/Task');
const mongoose = require('mongoose');

// Note: `setup.js` is automatically run before all test files in Jest.
// It sets up the in-memory MongoDB and seeds it before each test, ensuring a fresh state.

let adminToken, managerToken, dev1Token, dev2Token;
let adminUser, managerUser, devUser1, devUser2;
let testProject1, testProject2; // Seeded projects
let testTask1_P1_D1; // Seeded task: Design Home Page Layout

// Helper to get token for a user
const getToken = async (email, password) => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res.body.token;
};

beforeAll(async () => {
  // `setup.js` handles initial connection and seeding for the first `beforeEach`
  // We need to re-fetch users and tokens *after* seeding
  const users = await User.find({});
  adminUser = users.find(u => u.email === 'admin@example.com');
  managerUser = users.find(u => u.email === 'manager@example.com');
  devUser1 = users.find(u => u.email === 'dev1@example.com');
  devUser2 = users.find(u => u.email === 'dev2@example.com');

  adminToken = await getToken('admin@example.com', 'password123');
  managerToken = await getToken('manager@example.com', 'password123');
  dev1Token = await getToken('dev1@example.com', 'password123');
  dev2Token = await getToken('dev2@example.com', 'password123');
});

beforeEach(async () => {
  // `setup.js` already clears and re-seeds.
  // We just need to re-fetch the seeded projects and tasks as their IDs might change after re-seeding.
  const projects = await Project.find({});
  testProject1 = projects.find(p => p.name === 'Website Redesign');
  testProject2 = projects.find(p => p.name === 'Mobile App Development');

  const tasks = await Task.find({ projectId: testProject1._id });
  testTask1_P1_D1 = tasks.find(t => t.title === 'Design Home Page Layout');
});


describe('Task API Endpoints', () => {
  // --- Create Task ---
  describe('POST /api/v1/projects/:projectId/tasks', () => {
    test('should allow a project member (manager) to create a task', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'New Manager Task',
          description: 'Task created by manager',
          assignedTo: devUser1._id,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          priority: 'High'
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Manager Task');
      expect(res.body.data.projectId).toEqual(testProject1._id.toString());
      expect(res.body.data.assignedTo).toEqual(devUser1._id.toString());
    });

    test('should allow a project member (developer) to create a task', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({
          title: 'New Dev Task',
          description: 'Task created by dev1',
          assignedTo: devUser1._id,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          priority: 'Medium'
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Dev Task');
    });

    test('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Incomplete Task', // Missing description, assignedTo, dueDate
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Task description is required');
      expect(res.body.message).toContain('Assigned user is required');
      expect(res.body.message).toContain('Due date is required');
    });

    test('should return 404 if project does not exist', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/projects/${nonExistentProjectId}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Task for non-existent project',
          description: '...',
          assignedTo: devUser1._id,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        });
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Project not found');
    });

    test('should return 400 if assignedTo user is not a member of the project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Task assigned to non-member',
          description: '...',
          assignedTo: adminUser._id, // Admin is not a member of testProject1
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('is not a member of project');
    });

    test('should return 403 if user is not a project member and not admin', async () => {
      // Dev2 is not a member of testProject1
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${dev2Token}`)
        .send({
          title: 'Dev2 trying to create task in project1',
          description: '...',
          assignedTo: devUser1._id,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to create tasks in project');
    });
  });

  // --- Get Tasks ---
  describe('GET /api/v1/projects/:projectId/tasks', () => {
    test('should return tasks for a project member (dev1)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3); // 3 tasks in Project 1 from seed
      expect(res.body.data[0].projectId.name).toBe('Website Redesign');
      expect(res.body.data[0].assignedTo.username).toBe('devuser1');
    });

    test('should return 403 if user is not a project member and not admin', async () => {
      // Dev2 is not a member of testProject1
      const res = await request(app)
        .get(`/api/v1/projects/${testProject1._id}/tasks`)
        .set('Authorization', `Bearer ${dev2Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to view tasks in project');
    });
  });

  // --- Get Task By ID ---
  describe('GET /api/v1/tasks/:id', () => {
    test('should allow a project member (dev1) to get a task by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Design Home Page Layout');
      expect(res.body.data.assignedTo.username).toBe('devuser1');
    });

    test('should allow a project manager (owner) to get a task by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Design Home Page Layout');
    });

    test('should allow an admin to get any task by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Design Home Page Layout');
    });

    test('should return 403 if user is not a project member of task\'s project and not admin', async () => {
      // Dev2 is not a member of testProject1
      const res = await request(app)
        .get(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${dev2Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to view task');
    });

    test('should return 404 for non-existent task ID', async () => {
      const nonExistentTaskId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/tasks/${nonExistentTaskId}`)
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Task not found');
    });
  });

  // --- Update Task ---
  describe('PUT /api/v1/tasks/:id', () => {
    test('should allow the assigned user (dev1) to update their task', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: 'In Progress' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('In Progress');
    });

    test('should allow the project owner (manager) to update any task in their project', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ priority: 'Urgent' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priority).toBe('Urgent');
    });

    test('should allow an admin to update any task', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Title' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Admin Updated Title');
    });

    test('should prevent a non-assigned, non-owner, non-admin user from updating task', async () => {
      // Dev2 is not assigned to testTask1, not project owner, not admin
      const res = await request(app)
        .put(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${dev2Token}`)
        .send({ status: 'Done' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to update task');
    });

    test('should return 400 if new assignedTo user is not a project member', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ assignedTo: adminUser._id }); // Admin is not a member of testProject1

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('new assigned user');
      expect(res.body.message).toContain('is not a member of project');
    });

    test('should return 404 for non-existent task ID', async () => {
      const nonExistentTaskId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/tasks/${nonExistentTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Done' });
      expect(res.statusCode).toEqual(404);
    });
  });

  // --- Delete Task ---
  describe('DELETE /api/v1/tasks/:id', () => {
    test('should allow the project owner (manager) to delete a task', async () => {
      const initialTaskCount = await Task.countDocuments({ projectId: testProject1._id });
      expect(initialTaskCount).toBeGreaterThan(0);

      const res = await request(app)
        .delete(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Task deleted successfully');

      const taskAfterDelete = await Task.findById(testTask1_P1_D1._id);
      expect(taskAfterDelete).toBeNull();
      const finalTaskCount = await Task.countDocuments({ projectId: testProject1._id });
      expect(finalTaskCount).toBe(initialTaskCount - 1);
    });

    test('should allow an admin to delete any task', async () => {
      const initialTaskCount = await Task.countDocuments({ projectId: testProject1._id });

      const res = await request(app)
        .delete(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(await Task.findById(testTask1_P1_D1._id)).toBeNull();
      expect(await Task.countDocuments({ projectId: testProject1._id })).toBe(initialTaskCount - 1);
    });

    test('should prevent a non-owner, non-admin user (dev1) from deleting task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${testTask1_P1_D1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to delete task');
    });

    test('should return 404 for non-existent task ID', async () => {
      const nonExistentTaskId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/tasks/${nonExistentTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });
});
```
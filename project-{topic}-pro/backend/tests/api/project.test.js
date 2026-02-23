```javascript
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Project = require('../../src/models/Project');
const Task = require('../../src/models/Task');
const mongoose = require('mongoose');

// Note: `setup.js` is automatically run before all test files in Jest.
// It sets up the in-memory MongoDB and seeds it before each test, ensuring a fresh state.

let adminToken, managerToken, dev1Token;
let adminUser, managerUser, devUser1, devUser2;
let testProject1, testProject2; // Seeded projects

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
});

beforeEach(async () => {
  // `setup.js` already clears and re-seeds.
  // We just need to re-fetch the seeded projects as their IDs might change after re-seeding.
  const projects = await Project.find({});
  testProject1 = projects.find(p => p.name === 'Website Redesign');
  testProject2 = projects.find(p => p.name === 'Mobile App Development');
});

describe('Project API Endpoints', () => {
  // --- Create Project ---
  describe('POST /api/v1/projects', () => {
    test('should allow manager to create a project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'New Manager Project',
          description: 'Project managed by a new manager',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Manager Project');
      expect(res.body.data.owner).toEqual(managerUser._id.toString());
      // Ensure owner is automatically added as a manager member
      expect(res.body.data.members).toContainEqual(expect.objectContaining({
        user: managerUser._id.toString(),
        role: 'manager'
      }));
    });

    test('should allow admin to create a project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Admin Project',
          description: 'Project managed by admin',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.data.name).toBe('New Admin Project');
      expect(res.body.data.owner).toEqual(adminUser._id.toString());
    });

    test('should prevent developer from creating a project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({
          name: 'Dev Project',
          description: 'Dev trying to create',
        });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized');
    });

    test('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Incomplete Project', // Missing description
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Project description is required');
    });
  });

  // --- Get Projects ---
  describe('GET /api/v1/projects', () => {
    test('should return projects for authenticated manager (owner of two seeded projects)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2); // Manager is owner of 2 seeded projects
      expect(res.body.data[0].name).toBe('Website Redesign');
    });

    test('should return projects for authenticated developer (member of two seeded projects)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2); // Dev1 is member of Project 1 and Project 2
      expect(res.body.data.some(p => p.name === 'Website Redesign')).toBe(true);
      expect(res.body.data.some(p => p.name === 'Mobile App Development')).toBe(true);
    });

    test('should return projects for admin (owner of one, member of another, and has admin access)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      // Admin is owner of 'Internal Tools Optimization', implicitly member of all if allowed.
      // Based on the query ($or owner OR member), admin is associated with 1 seeded project.
      expect(res.body.count).toBe(1); // Admin is owner of one seeded project.
      expect(res.body.data[0].name).toBe('Internal Tools Optimization');
    });

    test('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/v1/projects');
      expect(res.statusCode).toEqual(401);
    });
  });

  // --- Get Project By ID ---
  describe('GET /api/v1/projects/:id', () => {
    test('should allow manager (owner) to get project by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.name).toBe('Website Redesign');
    });

    test('should allow developer (member) to get project by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.name).toBe('Website Redesign');
    });

    test('should allow admin to get any project by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.name).toBe('Website Redesign');
    });

    test('should return 403 if user is not a member and not admin', async () => {
      // Create a third project owned by Admin, where dev1 is not a member
      const newProject = await Project.create({
        name: 'Another Project',
        description: 'Should not be accessible by dev1',
        owner: adminUser._id,
        members: [{ user: adminUser._id, role: 'manager' }]
      });

      const res = await request(app)
        .get(`/api/v1/projects/${newProject._id}`)
        .set('Authorization', `Bearer ${dev1Token}`); // dev1 is not a member
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to access project');
    });

    test('should return 404 for non-existent project ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Project not found');
    });
  });

  // --- Update Project ---
  describe('PUT /api/v1/projects/:id', () => {
    test('should allow manager (owner) to update project', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Website Redesign' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.name).toBe('Updated Website Redesign');
    });

    test('should allow admin to update any project', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'archived' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.status).toBe('archived');
    });

    test('should prevent developer (member but not owner) from updating project', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ name: 'Dev trying to update' });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to update project');
    });

    test('should return 404 for non-existent project ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Non Existent' });
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('Project not found');
    });
  });

  // --- Delete Project ---
  describe('DELETE /api/v1/projects/:id', () => {
    test('should allow manager (owner) to delete project and associated tasks', async () => {
      // Create a task for this project
      await Task.create({
        title: 'Task to be deleted',
        description: 'This task will be removed with the project.',
        projectId: testProject1._id,
        assignedTo: devUser1._id,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      });

      const tasksBefore = await Task.countDocuments({ projectId: testProject1._id });
      expect(tasksBefore).toBeGreaterThan(0);

      const res = await request(app)
        .delete(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('Project and associated tasks deleted successfully');

      const projectAfter = await Project.findById(testProject1._id);
      expect(projectAfter).toBeNull();
      const tasksAfter = await Task.countDocuments({ projectId: testProject1._id });
      expect(tasksAfter).toBe(0);
    });

    test('should allow admin to delete any project and associated tasks', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
    });

    test('should prevent developer (member but not owner) from deleting project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${testProject1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to delete project');
    });

    test('should return 404 for non-existent project ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  // --- Add Project Member ---
  describe('POST /api/v1/projects/:id/members', () => {
    test('should allow manager (owner) to add a new member', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject2._id}/members`) // Manager is owner of project2
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: adminUser._id, role: 'developer' }); // Add admin as developer

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(3); // Initial 2 + 1 new
      expect(res.body.data.members).toContainEqual(expect.objectContaining({
        user: adminUser._id.toString(),
        role: 'developer'
      }));
    });

    test('should allow admin to add a new member to any project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/members`) // Admin adding to project1 (manager-owned)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: devUser2._id, role: 'developer' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(3);
      expect(res.body.data.members).toContainEqual(expect.objectContaining({
        user: devUser2._id.toString(),
        role: 'developer'
      }));
    });

    test('should return 400 if user is already a member', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/members`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: devUser1._id, role: 'developer' }); // dev1 is already a member

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('already a member');
    });

    test('should prevent developer from adding members', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject1._id}/members`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ userId: devUser2._id, role: 'developer' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to add members');
    });
  });

  // --- Remove Project Member ---
  describe('DELETE /api/v1/projects/:projectId/members/:memberId', () => {
    test('should allow manager (owner) to remove a member', async () => {
      // Ensure dev2 is a member of project2 (it is by default from seed)
      let project = await Project.findById(testProject2._id);
      expect(project.members).toHaveLength(3); // manager, dev1, dev2

      const res = await request(app)
        .delete(`/api/v1/projects/${testProject2._id}/members/${devUser2._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      const updatedProject = await Project.findById(testProject2._id);
      expect(updatedProject.members).toHaveLength(2); // dev2 removed
      expect(updatedProject.members.some(m => m.user.equals(devUser2._id))).toBe(false);

      // Verify tasks assigned to devUser2 in project2 are unassigned
      const tasksAssignedToRemovedDev = await Task.find({ projectId: testProject2._id, assignedTo: devUser2._id });
      expect(tasksAssignedToRemovedDev.every(t => !t.assignedTo)).toBe(true);
    });

    test('should prevent removing the project owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${testProject1._id}/members/${managerUser._id}`) // Manager is owner of project1
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Cannot remove project owner');
    });

    test('should return 404 if member is not found in project', async () => {
      const nonMemberId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/projects/${testProject1._id}/members/${nonMemberId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('is not a member of project');
    });

    test('should prevent developer from removing members', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${testProject1._id}/members/${devUser1._id}`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('is not authorized to remove members');
    });
  });
});
```
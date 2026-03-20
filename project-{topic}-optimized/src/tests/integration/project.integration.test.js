const request = require('supertest');
const app = require('../../app');
const prisma = require('../../../prisma/client');
const { hashPassword } = require('../../utils/bcrypt.util');
const { generateToken } = require('../../utils/jwt.util');
const { USER_ROLES, ProjectStatus } = require('../../config/constants');
const cacheService = require('../../services/cache.service');

describe('Project API Integration Tests', () => {
  let adminToken;
  let managerToken;
  let memberToken;
  let adminUser;
  let managerUser;
  let memberUser;
  let testProject;

  // Clear DB, seed, and generate tokens before all tests
  beforeAll(async () => {
    // Clear the test DB for a fresh start, apply migrations, and seed
    await prisma.$transaction([
      prisma.task.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany()
    ]);

    const hashedPassword = await hashPassword('password123');

    adminUser = await prisma.user.create({
      data: { username: 'admin_int', email: 'admin_int@example.com', password: hashedPassword, role: USER_ROLES.ADMIN }
    });
    managerUser = await prisma.user.create({
      data: { username: 'manager_int', email: 'manager_int@example.com', password: hashedPassword, role: USER_ROLES.MANAGER }
    });
    memberUser = await prisma.user.create({
      data: { username: 'member_int', email: 'member_int@example.com', password: hashedPassword, role: USER_ROLES.MEMBER }
    });

    adminToken = generateToken(adminUser.id, adminUser.role, process.env.JWT_SECRET, 10); // Short expiration for tests
    managerToken = generateToken(managerUser.id, managerUser.role, process.env.JWT_SECRET, 10);
    memberToken = generateToken(memberUser.id, memberUser.role, process.env.JWT_SECRET, 10);

    // Create a project for testing, owned by manager
    testProject = await prisma.project.create({
      data: {
        name: 'Integration Test Project',
        description: 'Project for integration tests',
        ownerId: managerUser.id,
        status: ProjectStatus.ACTIVE
      }
    });

    await cacheService.invalidateCacheByPattern('*'); // Clear cache after seeding
  });

  // Clean up any test-specific data after each test
  afterEach(async () => {
    // Optionally delete specific data created by a test if it deviates from beforeAll setup
    await cacheService.invalidateCacheByPattern('*'); // Clear cache after each test to prevent pollution
  });

  // After all tests, disconnect Prisma (handled by global setup/teardown)

  describe('POST /api/v1/projects', () => {
    it('should allow a manager to create a project', async () => {
      const newProjectData = {
        name: 'Manager Project',
        description: 'Created by manager',
        status: ProjectStatus.ACTIVE
      };
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newProjectData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.project).toBeDefined();
      expect(res.body.project.name).toEqual(newProjectData.name);
      expect(res.body.project.ownerId).toEqual(managerUser.id);

      const createdProject = await prisma.project.findUnique({ where: { id: res.body.project.id } });
      expect(createdProject).not.toBeNull();
      expect(createdProject.name).toEqual(newProjectData.name);
    });

    it('should allow a member to create a project', async () => {
      const newProjectData = {
        name: 'Member Project',
        description: 'Created by member',
        status: ProjectStatus.ACTIVE
      };
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(newProjectData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.project.ownerId).toEqual(memberUser.id);
    });

    it('should return 400 if validation fails', async () => {
      const newProjectData = {
        description: 'Missing name'
      };
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProjectData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation error');
      expect(res.body.errors).toContain('"name" is required');
    });

    it('should return 401 if not authenticated', async () => {
      const newProjectData = { name: 'Unauthorized Project' };
      const res = await request(app).post('/api/v1/projects').send(newProjectData);
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should allow admin to get all projects', async () => {
      const res = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3); // Includes seeded and created projects
      expect(res.body.some(p => p.id === testProject.id)).toBe(true);
    });

    it('should allow manager to get all projects', async () => {
      const res = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      expect(res.body.some(p => p.id === testProject.id)).toBe(true);
    });

    it('should allow member to get only their owned projects', async () => {
      const memberOwnedProject = await prisma.project.create({
        data: {
          name: 'Member Specific Project',
          ownerId: memberUser.id,
          status: ProjectStatus.ACTIVE
        }
      });
      await cacheService.invalidateCacheByPattern('*');

      const res = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${memberToken}`);
      expect(res.statusCode).toEqual(200);
      // Ensure only projects owned by memberUser are returned
      expect(res.body.every(p => p.ownerId === memberUser.id)).toBe(true);
      expect(res.body.some(p => p.id === memberOwnedProject.id)).toBe(true);
      expect(res.body.some(p => p.id === testProject.id)).toBe(false); // testProject is owned by manager
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/projects');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should allow owner (manager) to get their project by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(testProject.id);
    });

    it('should allow admin to get any project by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(testProject.id);
    });

    it('should forbid a member from getting a project they do not own', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .get('/api/v1/projects/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should allow owner (manager) to update their project', async () => {
      const updateData = { name: 'Updated Test Project Name' };
      const res = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.project.name).toEqual(updateData.name);

      const updatedProject = await prisma.project.findUnique({ where: { id: testProject.id } });
      expect(updatedProject.name).toEqual(updateData.name);
    });

    it('should allow admin to update any project', async () => {
      const updateData = { description: 'Updated by Admin' };
      const res = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.project.description).toEqual(updateData.description);
    });

    it('should forbid a member from updating a project they do not own', async () => {
      const updateData = { name: 'Attempted Update' };
      const res = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData);
      expect(res.statusCode).toEqual(403);
    });

    it('should return 400 if validation fails', async () => {
      const updateData = { name: '' }; // Invalid name
      const res = await request(app)
        .put(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toContain('"name" is not allowed to be empty');
    });

    it('should return 404 if project not found', async () => {
      const updateData = { name: 'Nonexistent' };
      const res = await request(app)
        .put('/api/v1/projects/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let projectToDelete;
    beforeEach(async () => {
      // Create a new project for each delete test to ensure it exists
      projectToDelete = await prisma.project.create({
        data: {
          name: 'Project to Delete',
          ownerId: managerUser.id,
          status: ProjectStatus.ACTIVE
        }
      });
      await cacheService.invalidateCacheByPattern('*');
    });

    it('should allow owner (manager) to delete their project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.statusCode).toEqual(204);

      const deletedProject = await prisma.project.findUnique({ where: { id: projectToDelete.id } });
      expect(deletedProject).toBeNull();
    });

    it('should allow admin to delete any project', async () => {
      const adminCreatedProject = await prisma.project.create({
        data: {
          name: 'Admin Delete Project',
          ownerId: adminUser.id,
          status: ProjectStatus.ACTIVE
        }
      });
      await cacheService.invalidateCacheByPattern('*');

      const res = await request(app)
        .delete(`/api/v1/projects/${adminCreatedProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(204);

      const deletedProject = await prisma.project.findUnique({ where: { id: adminCreatedProject.id } });
      expect(deletedProject).toBeNull();
    });

    it('should forbid a member from deleting a project they do not own', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.statusCode).toEqual(403);

      const existingProject = await prisma.project.findUnique({ where: { id: projectToDelete.id } });
      expect(existingProject).not.toBeNull(); // Should not be deleted
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .delete('/api/v1/projects/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
    });
  });
});
```

#### API Tests (Examples)

##### `src/tests/api/auth.api.test.js`

```javascript
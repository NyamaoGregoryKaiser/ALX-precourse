const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../app');
const { User, Project } = require('../../db/models');
const authService = require('../../services/auth.service');
const { v4: uuidv4 } = require('uuid');

describe('Project Routes Integration Tests', () => {
  let adminUser;
  let regularUser;
  let adminTokens;
  let regularTokens;
  let testProject;

  beforeAll(async () => {
    adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
    regularUser = await User.findOne({ where: { email: 'user@example.com' } });

    adminTokens = await authService.generateAuthTokens(adminUser);
    regularTokens = await authService.generateAuthTokens(regularUser);
  });

  beforeEach(async () => {
    // Clean up existing test projects and create a fresh one for each test for isolation
    await Project.destroy({ where: { name: ['Test Project', 'Updated Project', 'Another Test Project'] } });

    testProject = await Project.create({
      id: uuidv4(),
      name: 'Test Project',
      description: 'A project for integration testing.',
      createdBy: regularUser.id,
      status: 'pending',
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should allow an authenticated user to create a project', async () => {
      const newProject = {
        name: 'Another Test Project',
        description: 'Created by regular user.',
        status: 'in-progress',
      };

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .send(newProject)
        .expect(httpStatus.CREATED);

      expect(res.body).toBeDefined();
      expect(res.body.name).toBe(newProject.name);
      expect(res.body.createdBy).toBe(regularUser.id);
      expect(res.body.creator).toBeDefined(); // Creator should be included

      const projectInDb = await Project.findByPk(res.body.id);
      expect(projectInDb).toBeDefined();
      expect(projectInDb.name).toBe(newProject.name);
    });

    it('should return 401 if unauthenticated', async () => {
      const newProject = {
        name: 'Unauthorized Project',
        description: 'Should fail.',
      };

      await request(app)
        .post('/api/v1/projects')
        .send(newProject)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 400 if validation fails (e.g., missing name)', async () => {
      const invalidProject = {
        description: 'Missing name.',
      };

      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .send(invalidProject)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 400 if project name already exists', async () => {
      const duplicateProject = {
        name: testProject.name, // Use existing name
        description: 'Duplicate project.',
      };

      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .send(duplicateProject)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should retrieve all projects for an admin user', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminTokens.access.token}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.length).toBeGreaterThanOrEqual(1); // At least testProject + seeded ones
      expect(res.body.results[0].creator).toBeDefined();
    });

    it('should retrieve only projects created by a regular user', async () => {
      // Create another project by admin to ensure filtering works
      await Project.create({
        id: uuidv4(),
        name: 'Admin Project',
        description: 'Created by admin.',
        createdBy: adminUser.id,
        status: 'completed',
      });

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.every(p => p.createdBy === regularUser.id)).toBe(true);
      expect(res.body.totalResults).toBeGreaterThanOrEqual(1); // At least testProject
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app)
        .get('/api/v1/projects')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should retrieve a project by ID for the creator', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(testProject.id);
      expect(res.body.name).toBe(testProject.name);
      expect(res.body.creator).toBeDefined();
    });

    it('should retrieve a project by ID for an admin', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminTokens.access.token}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(testProject.id);
      expect(res.body.name).toBe(testProject.name);
    });

    it('should return 404 if project not found', async () => {
      await request(app)
        .get(`/api/v1/projects/${uuidv4()}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return 403 if a regular user tries to access another user\'s project', async () => {
      // Create a project by admin
      const adminCreatedProject = await Project.create({
        id: uuidv4(),
        name: 'Admin Only Project',
        createdBy: adminUser.id,
        status: 'pending',
      });

      await request(app)
        .get(`/api/v1/projects/${adminCreatedProject.id}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.FORBIDDEN);

      await adminCreatedProject.destroy();
    });
  });

  describe('PATCH /api/v1/projects/:projectId', () => {
    it('should allow creator to update their project', async () => {
      const updates = { name: 'Updated Project Name', status: 'in-progress' };
      const res = await request(app)
        .patch(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .send(updates)
        .expect(httpStatus.OK);

      expect(res.body.name).toBe(updates.name);
      expect(res.body.status).toBe(updates.status);

      const projectInDb = await Project.findByPk(testProject.id);
      expect(projectInDb.name).toBe(updates.name);
    });

    it('should allow admin to update any project', async () => {
      const updates = { description: 'Admin updated description' };
      const res = await request(app)
        .patch(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminTokens.access.token}`)
        .send(updates)
        .expect(httpStatus.OK);

      expect(res.body.description).toBe(updates.description);
    });

    it('should return 403 if a regular user tries to update another user\'s project', async () => {
      const adminCreatedProject = await Project.create({
        id: uuidv4(),
        name: 'Admin Project to Update',
        createdBy: adminUser.id,
        status: 'pending',
      });

      const updates = { status: 'completed' };
      await request(app)
        .patch(`/api/v1/projects/${adminCreatedProject.id}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .send(updates)
        .expect(httpStatus.FORBIDDEN);

      await adminCreatedProject.destroy();
    });

    it('should return 404 if project not found', async () => {
      const updates = { name: 'Non Existent' };
      await request(app)
        .patch(`/api/v1/projects/${uuidv4()}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .send(updates)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should allow creator to delete their project', async () => {
      await request(app)
        .delete(`/api/v1/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.NO_CONTENT);

      const projectInDb = await Project.findByPk(testProject.id);
      expect(projectInDb).toBeNull();
    });

    it('should allow admin to delete any project', async () => {
      const adminCreatedProject = await Project.create({
        id: uuidv4(),
        name: 'Another Project to Delete',
        createdBy: regularUser.id, // Admin can delete projects created by anyone
        status: 'pending',
      });

      await request(app)
        .delete(`/api/v1/projects/${adminCreatedProject.id}`)
        .set('Authorization', `Bearer ${adminTokens.access.token}`)
        .expect(httpStatus.NO_CONTENT);

      const projectInDb = await Project.findByPk(adminCreatedProject.id);
      expect(projectInDb).toBeNull();
    });

    it('should return 403 if a regular user tries to delete another user\'s project', async () => {
      const adminCreatedProject = await Project.create({
        id: uuidv4(),
        name: 'Admin Project to Delete',
        createdBy: adminUser.id,
        status: 'pending',
      });

      await request(app)
        .delete(`/api/v1/projects/${adminCreatedProject.id}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.FORBIDDEN);

      // Ensure it's not deleted
      const projectInDb = await Project.findByPk(adminCreatedProject.id);
      expect(projectInDb).not.toBeNull();

      await adminCreatedProject.destroy();
    });

    it('should return 404 if project not found', async () => {
      await request(app)
        .delete(`/api/v1/projects/${uuidv4()}`)
        .set('Authorization', `Bearer ${regularTokens.access.token}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
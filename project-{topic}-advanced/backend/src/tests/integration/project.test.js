const request = require('supertest');
const app = require('../../app');
const sequelize = require('../../config/database');
const { User, Project } = require('../../models');
const { generateToken } = require('../../services/authService');
const cache = require('../../utils/cache');

describe('Project API', () => {
  let adminToken, userToken, adminUser, regularUser;

  beforeAll(async () => {
    // Connect to test database
    await sequelize.sync({ force: true }); // Clear and recreate tables
    cache.flushAll();

    // Create test users
    adminUser = await User.create({
      username: 'adminTest',
      email: 'adminTest@example.com',
      password: 'password123',
      role: 'admin',
    });
    regularUser = await User.create({
      username: 'userTest',
      email: 'userTest@example.com',
      password: 'password123',
      role: 'user',
    });

    adminToken = generateToken(adminUser.id);
    userToken = generateToken(regularUser.id);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear projects before each test
    await Project.destroy({ truncate: true, cascade: true });
    cache.flushAll(); // Clear cache before each test
  });

  // --- POST /api/projects ---
  describe('POST /api/projects', () => {
    it('should create a new project for an authenticated user', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New User Project',
          description: 'A project created by a regular user',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New User Project');
      expect(res.body.ownerId).toBe(regularUser.id);

      const projectInDb = await Project.findByPk(res.body.id);
      expect(projectInDb).not.toBeNull();
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Project without a name',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Project name is required');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({
          name: 'Unauthorized Project',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Not authorized, no token.');
    });
  });

  // --- GET /api/projects ---
  describe('GET /api/projects', () => {
    let project1, project2, project3;
    beforeEach(async () => {
      project1 = await Project.create({
        name: 'Admin Project 1',
        ownerId: adminUser.id,
      });
      project2 = await Project.create({
        name: 'User Project 1',
        ownerId: regularUser.id,
      });
      project3 = await Project.create({
        name: 'Admin Project 2',
        ownerId: adminUser.id,
      });
    });

    it('should return all projects for an admin user', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.map(p => p.name)).toEqual(expect.arrayContaining([project1.name, project2.name, project3.name]));
    });

    it('should return only projects owned by the regular user when `myProjects=true`', async () => {
      const res = await request(app)
        .get('/api/projects?myProjects=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe(project2.name);
      expect(res.body[0].owner.id).toBe(regularUser.id);
    });

    it('should return all projects for a regular user by default (implementation choice)', async () => {
      // Current implementation allows any user to see all projects by default.
      // This can be adjusted in projectService.getProjects to filter by ownerId by default if needed.
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(3);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/projects');

      expect(res.statusCode).toEqual(401);
    });
  });

  // --- GET /api/projects/:id ---
  describe('GET /api/projects/:id', () => {
    let project;
    beforeEach(async () => {
      project = await Project.create({
        name: 'Single Project',
        ownerId: regularUser.id,
        description: 'Description for single project',
      });
    });

    it('should return a single project by ID for the owner', async () => {
      const res = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(project.id);
      expect(res.body.name).toBe(project.name);
      expect(res.body.owner.id).toBe(regularUser.id);
    });

    it('should return a single project by ID for an admin', async () => {
      const res = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(project.id);
      expect(res.body.name).toBe(project.name);
      expect(res.body.owner.id).toBe(regularUser.id);
    });

    it('should return 403 if a non-owner/non-admin tries to access a project', async () => {
      const otherUser = await User.create({
        username: 'otherUser',
        email: 'other@example.com',
        password: 'password123',
        role: 'user',
      });
      const otherUserToken = generateToken(otherUser.id);

      const res = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Not authorized to view this project');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .get(`/api/projects/${adminUser.id}`) // Use an ID that isn't a project ID
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('Project not found');
    });
  });

  // --- PUT /api/projects/:id ---
  describe('PUT /api/projects/:id', () => {
    let project;
    beforeEach(async () => {
      project = await Project.create({
        name: 'Project to Update',
        ownerId: regularUser.id,
        status: 'active',
      });
    });

    it('should update a project for the owner', async () => {
      const updatedName = 'Updated Project Name';
      const res = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: updatedName,
          status: 'completed',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(project.id);
      expect(res.body.name).toBe(updatedName);
      expect(res.body.status).toBe('completed');

      const projectInDb = await Project.findByPk(project.id);
      expect(projectInDb.name).toBe(updatedName);
      expect(projectInDb.status).toBe('completed');
    });

    it('should update a project for an admin', async () => {
      const updatedName = 'Admin Updated Project Name';
      const res = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: updatedName,
          status: 'archived',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe(updatedName);
      expect(res.body.status).toBe('archived');
    });

    it('should return 403 if a non-owner/non-admin tries to update a project', async () => {
      const otherUser = await User.create({
        username: 'anotherUser',
        email: 'another@example.com',
        password: 'password123',
        role: 'user',
      });
      const otherUserToken = generateToken(otherUser.id);

      const res = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Attempted Update' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Not authorized to update this project');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .put(`/api/projects/${adminUser.id}`) // Use an ID that isn't a project ID
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Nonexistent Project' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('Project not found');
    });
  });

  // --- DELETE /api/projects/:id ---
  describe('DELETE /api/projects/:id', () => {
    let project;
    beforeEach(async () => {
      project = await Project.create({
        name: 'Project to Delete',
        ownerId: regularUser.id,
      });
    });

    it('should delete a project for the owner', async () => {
      const res = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Project deleted successfully');

      const projectInDb = await Project.findByPk(project.id);
      expect(projectInDb).toBeNull();
    });

    it('should delete a project for an admin', async () => {
      const projectByAdmin = await Project.create({
        name: 'Project to be deleted by Admin',
        ownerId: regularUser.id,
      });

      const res = await request(app)
        .delete(`/api/projects/${projectByAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Project deleted successfully');

      const projectInDb = await Project.findByPk(projectByAdmin.id);
      expect(projectInDb).toBeNull();
    });

    it('should return 403 if a non-owner/non-admin tries to delete a project', async () => {
      const otherUser = await User.create({
        username: 'someOtherUser',
        email: 'someother@example.com',
        password: 'password123',
        role: 'user',
      });
      const otherUserToken = generateToken(otherUser.id);

      const res = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Not authorized to delete this project');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .delete(`/api/projects/${adminUser.id}`) // Use an ID that isn't a project ID
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('Project not found');
    });
  });
});
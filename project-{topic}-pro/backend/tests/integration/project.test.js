const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Project } = require('../../src/db/sequelize');
const { generateToken } = require('../../src/utils/jwt');
const bcrypt = require('bcryptjs');
const { redisClient } = require('../../src/utils/redisClient'); // Import redis client

describe('Project API', () => {
  let user1, user2, token1, token2;
  const userPassword = 'Password123!';

  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Clean DB for integration tests
    await redisClient.connect(); // Ensure Redis client is connected
  });

  beforeEach(async () => {
    await User.destroy({ truncate: true, cascade: true });
    await Project.destroy({ truncate: true, cascade: true });
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

    token1 = generateToken(user1.id);
    token2 = generateToken(user2.id);
  });

  afterAll(async () => {
    await sequelize.close();
    await redisClient.quit();
  });

  // Helper function to create a project
  const createProject = async (token, name, description) => {
    return request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, description });
  };

  describe('GET /api/projects', () => {
    it('should return all projects for the authenticated user', async () => {
      await createProject(token1, 'User 1 Project A', 'Description A');
      await createProject(token1, 'User 1 Project B', 'Description B');
      await createProject(token2, 'User 2 Project C', 'Description C'); // Should not be visible to User 1

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(2);
      expect(res.body.data.projects.length).toBe(2);
      expect(res.body.data.projects[0].name).toBe('User 1 Project B'); // Latest first
      expect(res.body.data.projects[1].name).toBe('User 1 Project A');
      expect(res.body.data.projects[0].userId).toBe(user1.id);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectName = 'New Project for User 1';
      const projectDescription = 'This is a new project.';

      const res = await createProject(token1, projectName, projectDescription);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.project).toBeDefined();
      expect(res.body.data.project.name).toBe(projectName);
      expect(res.body.data.project.description).toBe(projectDescription);
      expect(res.body.data.project.userId).toBe(user1.id);

      const projectInDb = await Project.findByPk(res.body.data.project.id);
      expect(projectInDb).not.toBeNull();
      expect(projectInDb.name).toBe(projectName);
    });

    it('should return 400 for invalid input (e.g., missing name)', async () => {
      const res = await createProject(token1, null, 'No name');
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('name is required');
    });
  });

  describe('GET /api/projects/:id', () => {
    let user1Project;

    beforeEach(async () => {
      const res = await createProject(token1, 'Single Project', 'Description');
      user1Project = res.body.data.project;
    });

    it('should return a single project by ID if owned by the user', async () => {
      const res = await request(app)
        .get(`/api/projects/${user1Project.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.project.id).toBe(user1Project.id);
      expect(res.body.data.project.name).toBe('Single Project');
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const res = await request(app)
        .get(`/api/projects/${user1Project.id}`)
        .set('Authorization', `Bearer ${token2}`); // User 2 trying to access User 1's project

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to access it.');
    });

    it('should return 404 for a non-existent project ID', async () => {
      const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-000000000000';
      const res = await request(app)
        .get(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('PUT /api/projects/:id', () => {
    let user1Project;

    beforeEach(async () => {
      const res = await createProject(token1, 'Updatable Project', 'Initial description');
      user1Project = res.body.data.project;
    });

    it('should update a project successfully if owned by the user', async () => {
      const updatedName = 'Updated Project Name';
      const updatedDescription = 'New description for the project.';

      const res = await request(app)
        .put(`/api/projects/${user1Project.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: updatedName, description: updatedDescription });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.project.name).toBe(updatedName);
      expect(res.body.data.project.description).toBe(updatedDescription);

      const projectInDb = await Project.findByPk(user1Project.id);
      expect(projectInDb.name).toBe(updatedName);
      expect(projectInDb.description).toBe(updatedDescription);
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const res = await request(app)
        .put(`/api/projects/${user1Project.id}`)
        .set('Authorization', `Bearer ${token2}`) // User 2 trying to update User 1's project
        .send({ name: 'Attempted Update' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to update it.');
    });

    it('should return 400 for invalid update input (e.g., empty name)', async () => {
      const res = await request(app)
        .put(`/api/projects/${user1Project.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: '' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('name length must be at least 3 characters long');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let projectToDelete;

    beforeEach(async () => {
      const res = await createProject(token1, 'Project to Delete', 'Description');
      projectToDelete = res.body.data.project;
    });

    it('should delete a project successfully if owned by the user', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(204); // No Content
      expect(res.body).toEqual({}); // Empty body for 204

      const projectInDb = await Project.findByPk(projectToDelete.id);
      expect(projectInDb).toBeNull();
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${token2}`); // User 2 trying to delete User 1's project

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to delete it.');
    });

    it('should return 404 for a non-existent project ID', async () => {
      const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-000000000000';
      const res = await request(app)
        .delete(`/api/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
    });
  });
});
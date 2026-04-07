const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../app');
const { User, Project } = require('../../db/models');
const { v4: uuidv4 } = require('uuid');

describe('Project API Tests', () => {
  let adminUser;
  let regularUser;
  let adminAccessToken;
  let regularAccessToken;
  let testProjectId;

  beforeAll(async () => {
    adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
    regularUser = await User.findOne({ where: { email: 'user@example.com' } });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: 'password123' });
    adminAccessToken = adminLoginRes.body.tokens.access.token;

    const regularLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'password123' });
    regularAccessToken = regularLoginRes.body.tokens.access.token;

    // Create a project for testing GET/PATCH/DELETE
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${regularAccessToken}`)
      .send({
        name: `API Test Project ${uuidv4()}`,
        description: 'Project for API testing',
        status: 'pending',
      })
      .expect(httpStatus.CREATED);
    testProjectId = projectRes.body.id;
  });

  afterAll(async () => {
    // Clean up any remaining test projects
    await Project.destroy({ where: { createdBy: regularUser.id, name: { [Project.sequelize.Op.like]: 'API Test Project%' } } });
    await Project.destroy({ where: { createdBy: adminUser.id, name: { [Project.sequelize.Op.like]: 'API Test Project%' } } });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project by regular user', async () => {
      const projectName = `New API Project ${uuidv4()}`;
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({
          name: projectName,
          description: 'This is a brand new project.',
          status: 'pending',
        })
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(projectName);
      expect(res.body.createdBy).toBe(regularUser.id);
      expect(res.body.status).toBe('pending');
    });

    it('should not create a project with duplicate name', async () => {
      const projectName = `Unique Name Project ${uuidv4()}`;
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ name: projectName, description: 'first' })
        .expect(httpStatus.CREATED);

      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ name: projectName, description: 'second' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should retrieve projects with pagination and filters', async () => {
      // Create additional projects to test pagination
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ name: `Paginated Project 1 ${uuidv4()}`, status: 'in-progress' })
        .expect(httpStatus.CREATED);
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ name: `Paginated Project 2 ${uuidv4()}`, status: 'completed' })
        .expect(httpStatus.CREATED);

      const res = await request(app)
        .get('/api/v1/projects?limit=1&page=1&sortBy=name:asc')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.totalResults).toBeGreaterThanOrEqual(1);
    });

    it('should filter projects by status', async () => {
      const res = await request(app)
        .get('/api/v1/projects?status=pending')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.results.every(p => p.status === 'pending')).toBe(true);
      expect(res.body.totalResults).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should retrieve a single project by its ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(testProjectId);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('description');
      expect(res.body).toHaveProperty('creator');
      expect(res.body.creator.id).toBe(regularUser.id);
    });

    it('should return 404 for a non-existent project ID', async () => {
      await request(app)
        .get(`/api/v1/projects/${uuidv4()}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/projects/:projectId', () => {
    it('should update an existing project', async () => {
      const updatedName = `Updated API Project Name ${uuidv4()}`;
      const res = await request(app)
        .patch(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ name: updatedName, status: 'in-progress' })
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(testProjectId);
      expect(res.body.name).toBe(updatedName);
      expect(res.body.status).toBe('in-progress');
    });

    it('should not update a project with an invalid status', async () => {
      await request(app)
        .patch(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ status: 'invalid-status' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should delete an existing project', async () => {
      const projectToDeleteId = testProjectId; // Use the created project
      testProjectId = null; // Mark it as deleted to prevent afterAll cleanup errors

      await request(app)
        .delete(`/api/v1/projects/${projectToDeleteId}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      await request(app)
        .get(`/api/v1/projects/${projectToDeleteId}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return 404 when trying to delete a non-existent project', async () => {
      await request(app)
        .delete(`/api/v1/projects/${uuidv4()}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import { createApp } from '../../src/app';
import { User } from '../../src/entities/User';
import { Project } from '../../src/entities/Project';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { environment } from '../../src/config/environment';
import { Application } from 'express';

// Extend AppDataSource with a method to clear tables for testing
interface TestDataSource extends AppDataSource {
    clear: (entity: any) => Promise<void>;
}

// Add a clear method to AppDataSource for testing purposes
(AppDataSource as TestDataSource).clear = async (entity: any) => {
    const repository = AppDataSource.getRepository(entity);
    await repository.query(`TRUNCATE TABLE "${repository.metadata.tableName}" CASCADE;`);
};

describe('Project API Integration Tests', () => {
  let app: Application;
  let adminToken: string;
  let userToken: string;
  let adminUser: User;
  let regularUser: User;
  let testProject: Project;

  beforeAll(async () => {
    await AppDataSource.initialize();
    app = createApp();

    // Create test users
    adminUser = AppDataSource.getRepository(User).create({
      username: 'admin_test',
      email: 'admin_test@example.com',
      password: await bcrypt.hash('adminpassword', 10),
      role: 'admin',
    });
    regularUser = AppDataSource.getRepository(User).create({
      username: 'user_test',
      email: 'user_test@example.com',
      password: await bcrypt.hash('userpassword', 10),
      role: 'user',
    });
    await AppDataSource.getRepository(User).save([adminUser, regularUser]);

    // Generate tokens
    adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, environment.jwtSecret, { expiresIn: '1h' });
    userToken = jwt.sign({ userId: regularUser.id, role: regularUser.role }, environment.jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up test data
    await (AppDataSource as TestDataSource).clear(Project);
    await (AppDataSource as TestDataSource).clear(User);
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear projects before each test
    await (AppDataSource as TestDataSource).clear(Project);
    // Create a default project for regularUser for some tests
    testProject = AppDataSource.getRepository(Project).create({
      name: 'User Project 1',
      description: 'A project by regular user',
      user: regularUser,
    });
    await AppDataSource.getRepository(Project).save(testProject);
  });

  // --- POST /api/projects ---
  describe('POST /api/projects', () => {
    it('should create a new project for the authenticated user', async () => {
      const newProjectData = { name: 'My New Project', description: 'Description for new project' };
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProjectData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.name).toEqual(newProjectData.name);
      expect(res.body.data.user.id).toEqual(regularUser.id);
      expect(res.body.data.id).toBeDefined();

      const createdProject = await AppDataSource.getRepository(Project).findOne({ where: { id: res.body.data.id }, relations: ['user'] });
      expect(createdProject).toBeDefined();
      expect(createdProject!.user.id).toEqual(regularUser.id);
    });

    it('should return 400 if validation fails (missing name)', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'Description without name' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Validation error');
    });

    it('should return 409 if project name already exists for the user', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User Project 1', description: 'Duplicate name' }); // testProject already has this name for regularUser

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Project with name "User Project 1" already exists for this user.');
    });

    it('should return 401 if no token is provided', async () => {
      const newProjectData = { name: 'Unauthorized Project', description: 'Should fail' };
      const res = await request(app)
        .post('/api/projects')
        .send(newProjectData);

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Authentication token required');
    });
  });

  // --- GET /api/projects ---
  describe('GET /api/projects', () => {
    it('should return all projects for the authenticated regular user', async () => {
      // Create another project for the regular user
      const userProject2 = AppDataSource.getRepository(Project).create({
        name: 'User Project 2',
        description: 'Another project by regular user',
        user: regularUser,
      });
      await AppDataSource.getRepository(Project).save(userProject2);

      const adminProject = AppDataSource.getRepository(Project).create({
        name: 'Admin Project',
        description: 'A project by admin user',
        user: adminUser,
      });
      await AppDataSource.getRepository(Project).save(adminProject);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data).toHaveLength(2); // Only projects by regularUser
      expect(res.body.data.map((p: any) => p.name)).toEqual(expect.arrayContaining(['User Project 1', 'User Project 2']));
      expect(res.body.data.some((p: any) => p.name === 'Admin Project')).toBeFalsy();
    });

    it('should return all projects for an admin user', async () => {
      // Ensure there are projects from both users
      const adminProject = AppDataSource.getRepository(Project).create({
        name: 'Admin Project',
        description: 'A project by admin user',
        user: adminUser,
      });
      await AppDataSource.getRepository(Project).save(adminProject);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(2); // Should include testProject + adminProject
      expect(res.body.data.map((p: any) => p.name)).toEqual(expect.arrayContaining(['User Project 1', 'Admin Project']));
    });
  });

  // --- GET /api/projects/:id ---
  describe('GET /api/projects/:id', () => {
    it('should return a specific project for its owner', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.id).toEqual(testProject.id);
      expect(res.body.data.name).toEqual(testProject.name);
      expect(res.body.data.user.id).toEqual(regularUser.id);
    });

    it('should return a specific project for an admin user', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.id).toEqual(testProject.id);
      expect(res.body.data.name).toEqual(testProject.name);
      expect(res.body.data.user.id).toEqual(regularUser.id);
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const otherUser = AppDataSource.getRepository(User).create({
        username: 'other_user',
        email: 'other@example.com',
        password: await bcrypt.hash('otherpassword', 10),
        role: 'user',
      });
      await AppDataSource.getRepository(User).save(otherUser);
      const otherUserToken = jwt.sign({ userId: otherUser.id, role: otherUser.role }, environment.jwtSecret, { expiresIn: '1h' });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}`) // Attempt to access regularUser's project with otherUser's token
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to view it');
    });

    it('should return 404 for a non-existent project ID', async () => {
      const res = await request(app)
        .get('/api/projects/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to view it');
    });
  });

  // --- PUT /api/projects/:id ---
  describe('PUT /api/projects/:id', () => {
    it('should update a project for its owner', async () => {
      const updateData = { name: 'Updated User Project', description: 'New description' };
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.name).toEqual(updateData.name);
      expect(res.body.data.description).toEqual(updateData.description);

      const updatedProject = await AppDataSource.getRepository(Project).findOneBy({ id: testProject.id });
      expect(updatedProject!.name).toEqual(updateData.name);
      expect(updatedProject!.description).toEqual(updateData.description);
    });

    it('should update a project for an admin user', async () => {
      const updateData = { name: 'Admin Updated User Project', description: 'Admin new description' };
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.name).toEqual(updateData.name);
      expect(res.body.data.description).toEqual(updateData.description);
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const otherUser = AppDataSource.getRepository(User).create({
        username: 'other_user_put',
        email: 'other_put@example.com',
        password: await bcrypt.hash('otherpassword', 10),
        role: 'user',
      });
      await AppDataSource.getRepository(User).save(otherUser);
      const otherUserToken = jwt.sign({ userId: otherUser.id, role: otherUser.role }, environment.jwtSecret, { expiresIn: '1h' });

      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Attempted Update' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to update it');
    });

    it('should return 409 if updated name already exists for the project owner', async () => {
      const anotherProject = AppDataSource.getRepository(Project).create({
        name: 'Another Project by User',
        description: 'Temp',
        user: regularUser,
      });
      await AppDataSource.getRepository(Project).save(anotherProject);

      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Another Project by User' }); // Try to change testProject's name to anotherProject's name

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Project with name "Another Project by User" already exists for this user.');
    });
  });

  // --- DELETE /api/projects/:id ---
  describe('DELETE /api/projects/:id', () => {
    it('should delete a project for its owner', async () => {
      const projectToDelete = AppDataSource.getRepository(Project).create({
        name: 'Project To Delete',
        description: 'This will be removed',
        user: regularUser,
      });
      await AppDataSource.getRepository(Project).save(projectToDelete);

      const res = await request(app)
        .delete(`/api/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(204); // No content on successful delete

      const deletedProject = await AppDataSource.getRepository(Project).findOneBy({ id: projectToDelete.id });
      expect(deletedProject).toBeNull();
    });

    it('should delete a project for an admin user', async () => {
      const projectToDelete = AppDataSource.getRepository(Project).create({
        name: 'Project To Delete By Admin',
        description: 'This will be removed by admin',
        user: regularUser, // Owned by regular user
      });
      await AppDataSource.getRepository(Project).save(projectToDelete);

      const res = await request(app)
        .delete(`/api/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);

      const deletedProject = await AppDataSource.getRepository(Project).findOneBy({ id: projectToDelete.id });
      expect(deletedProject).toBeNull();
    });

    it('should return 404 if project not found or not owned by user', async () => {
      const otherUser = AppDataSource.getRepository(User).create({
        username: 'other_user_del',
        email: 'other_del@example.com',
        password: await bcrypt.hash('otherpassword', 10),
        role: 'user',
      });
      await AppDataSource.getRepository(User).save(otherUser);
      const otherUserToken = jwt.sign({ userId: otherUser.id, role: otherUser.role }, environment.jwtSecret, { expiresIn: '1h' });

      const res = await request(app)
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual('fail');
      expect(res.body.message).toContain('Project not found or you do not have permission to delete it');
    });
  });
});
```
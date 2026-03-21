```typescript
import 'reflect-metadata';
import request from 'supertest';
import { AppDataSource } from '../../ormconfig';
import app from '../../app';
import { User, UserRole } from '@models/User';
import { Project, ProjectStatus } from '@models/Project';
import { Task } from '@models/Task';
import { hashPassword } from '@utils/password';
import { generateAccessToken } from '@utils/jwt';

// Silence logger for API tests
jest.mock('@config/logger');

describe('Project API Tests', () => {
  let adminUser: User;
  let managerUser: User;
  let regularUser: User;

  let adminAccessToken: string;
  let managerAccessToken: string;
  let regularUserAccessToken: string;

  let projectByAdmin: Project;
  let projectByManager: Project;
  let projectByRegularUser: Project;

  beforeAll(async () => {
    // Clear data from previous tests
    await AppDataSource.getRepository(Task).delete({});
    await AppDataSource.getRepository(Project).delete({});
    await AppDataSource.getRepository(User).delete({});

    const hashedPassword = await hashPassword('password123');

    adminUser = AppDataSource.getRepository(User).create({ username: 'admin_p', email: 'admin_p@test.com', password: hashedPassword, role: UserRole.ADMIN });
    await AppDataSource.getRepository(User).save(adminUser);
    adminAccessToken = generateAccessToken({ id: adminUser.id, role: adminUser.role });

    managerUser = AppDataSource.getRepository(User).create({ username: 'manager_p', email: 'manager_p@test.com', password: hashedPassword, role: UserRole.MANAGER });
    await AppDataSource.getRepository(User).save(managerUser);
    managerAccessToken = generateAccessToken({ id: managerUser.id, role: managerUser.role });

    regularUser = AppDataSource.getRepository(User).create({ username: 'user_p', email: 'user_p@test.com', password: hashedPassword, role: UserRole.USER });
    await AppDataSource.getRepository(User).save(regularUser);
    regularUserAccessToken = generateAccessToken({ id: regularUser.id, role: regularUser.role });

    projectByAdmin = AppDataSource.getRepository(Project).create({
      name: 'Admin Project', description: 'Admin project desc', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01'), status: ProjectStatus.PLANNED, owner: adminUser, ownerId: adminUser.id
    });
    await AppDataSource.getRepository(Project).save(projectByAdmin);

    projectByManager = AppDataSource.getRepository(Project).create({
      name: 'Manager Project', description: 'Manager project desc', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01'), status: ProjectStatus.PLANNED, owner: managerUser, ownerId: managerUser.id
    });
    await AppDataSource.getRepository(Project).save(projectByManager);

    projectByRegularUser = AppDataSource.getRepository(Project).create({
      name: 'User Project', description: 'User project desc', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01'), status: ProjectStatus.PLANNED, owner: regularUser, ownerId: regularUser.id
    });
    await AppDataSource.getRepository(Project).save(projectByRegularUser);
  });

  afterAll(async () => {
    await AppDataSource.getRepository(Task).delete({});
    await AppDataSource.getRepository(Project).delete({});
    await AppDataSource.getRepository(User).delete({});
  });

  describe('POST /api/projects', () => {
    it('should allow an admin to create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'New Admin Project',
          description: 'A project created by an admin.',
          startDate: '2024-07-01',
          endDate: '2024-08-01',
          status: ProjectStatus.IN_PROGRESS,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.name).toBe('New Admin Project');
      expect(res.body.ownerId).toBe(adminUser.id);
    });

    it('should allow a regular user to create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({
          name: 'New User Project',
          description: 'A project created by a regular user.',
          startDate: '2024-07-01',
          endDate: '2024-08-01',
          status: ProjectStatus.PLANNED,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.name).toBe('New User Project');
      expect(res.body.ownerId).toBe(regularUser.id);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({
          name: 'Unauthorized Project',
          description: 'Desc',
          startDate: '2024-07-01',
          endDate: '2024-08-01',
          status: ProjectStatus.PLANNED,
        });
      expect(res.statusCode).toEqual(401);
    });

    it('should return 400 for invalid project data', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Short', // Too short
          description: 'Too short', // Too short
          startDate: '2024-07-01',
          endDate: '2024-06-01', // End date before start date
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Validation error');
    });
  });

  describe('GET /api/projects', () => {
    it('should allow admin to get all projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3); // Existing + new
      expect(res.body.map((p: Project) => p.name)).toEqual(expect.arrayContaining([projectByAdmin.name, projectByManager.name, projectByRegularUser.name]));
    });

    it('should allow manager to get all projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${managerAccessToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow regular user to get all projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${regularUserAccessToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3); // User can see all now, filtering logic is in `getAllProjects(userId)` not currently applied for regular users globally. For a user to only see their own projects, the `getAllProjects` controller would need to be updated to pass `req.user.id`.
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should allow project owner to update their project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectByRegularUser.id}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({ name: 'Updated User Project Name' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe('Updated User Project Name');
    });

    it('should allow manager to update any project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectByRegularUser.id}`)
        .set('Authorization', `Bearer ${managerAccessToken}`)
        .send({ name: 'Updated by Manager' });
      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe('Updated by Manager');
    });

    it('should prevent a non-owner/non-manager/non-admin from updating a project', async () => {
      // Create another user not associated with any existing project
      const anotherUser = AppDataSource.getRepository(User).create({
        username: 'another_user', email: 'another@test.com', password: await hashPassword('pass123'), role: UserRole.USER
      });
      await AppDataSource.getRepository(User).save(anotherUser);
      const anotherUserAccessToken = generateAccessToken({ id: anotherUser.id, role: anotherUser.role });

      const res = await request(app)
        .put(`/api/projects/${projectByAdmin.id}`)
        .set('Authorization', `Bearer ${anotherUserAccessToken}`)
        .send({ name: 'Attempted update' });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Forbidden: You do not have permission to update this project.');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should allow project owner to delete their project', async () => {
      // Create a project specifically for deletion test
      const projectToDelete = AppDataSource.getRepository(Project).create({
        name: 'Project to Delete', description: 'Desc', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01'), status: ProjectStatus.PLANNED, owner: regularUser, ownerId: regularUser.id
      });
      await AppDataSource.getRepository(Project).save(projectToDelete);

      const res = await request(app)
        .delete(`/api/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`);
      expect(res.statusCode).toEqual(204);
      const found = await AppDataSource.getRepository(Project).findOne({ where: { id: projectToDelete.id } });
      expect(found).toBeNull();
    });

    it('should allow admin to delete any project', async () => {
      // Create a project specifically for deletion test
      const projectToDelete = AppDataSource.getRepository(Project).create({
        name: 'Admin Delete Target', description: 'Desc', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01'), status: ProjectStatus.PLANNED, owner: regularUser, ownerId: regularUser.id
      });
      await AppDataSource.getRepository(Project).save(projectToDelete);

      const res = await request(app)
        .delete(`/api/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);
      expect(res.statusCode).toEqual(204);
      const found = await AppDataSource.getRepository(Project).findOne({ where: { id: projectToDelete.id } });
      expect(found).toBeNull();
    });

    it('should prevent manager from deleting a project not owned by them', async () => {
      // Manager cannot delete projects they don't own, unless they are admin.
      const res = await request(app)
        .delete(`/api/projects/${projectByRegularUser.id}`)
        .set('Authorization', `Bearer ${managerAccessToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Forbidden: You do not have permission to delete this project.');
    });
  });
});
```
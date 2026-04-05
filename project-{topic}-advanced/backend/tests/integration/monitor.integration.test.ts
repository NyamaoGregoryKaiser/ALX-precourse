```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User, UserRole } from '../../src/entities/User.entity';
import { Project } from '../../src/entities/Project.entity';
import { Monitor, MonitorMethod, MonitorStatus } from '../../src/entities/Monitor.entity';
import { generateJwtToken } from '../../src/auth/jwt.utils';
import { hashPassword } from '../../src/utils/password.utils';
import { StatusCodes } from 'http-status-codes';

// Mock the monitor-scheduler to prevent actual HTTP requests during tests
jest.mock('../../src/jobs/monitor-scheduler', () => ({
  startMonitorScheduler: jest.fn(),
  checkMonitor: jest.fn(),
}));

describe('Monitor API Integration Tests', () => {
  let testUser: User;
  let testAdmin: User;
  let testProject: Project;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await AppDataSource.initialize();

    // Clear database before tests
    await AppDataSource.synchronize(true); // Drops and recreates schema

    // Create test users
    const userRepo = AppDataSource.getRepository(User);
    const hashedPassword = await hashPassword('password123');

    testUser = userRepo.create({
      username: 'testuser_mon',
      email: 'testuser_mon@example.com',
      password: hashedPassword,
      role: UserRole.USER,
    });
    await userRepo.save(testUser);

    testAdmin = userRepo.create({
      username: 'testadmin_mon',
      email: 'testadmin_mon@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await userRepo.save(testAdmin);

    // Generate tokens
    userToken = generateJwtToken(testUser.id, testUser.role);
    adminToken = generateJwtToken(testAdmin.id, testAdmin.role);

    // Create a project for the test user
    const projectRepo = AppDataSource.getRepository(Project);
    testProject = projectRepo.create({
      name: 'User Monitored Project',
      description: 'Project for testing monitors',
      userId: testUser.id,
    });
    await projectRepo.save(testProject);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('POST /api/v1/monitors', () => {
    it('should create a new monitor for the authenticated user', async () => {
      const newMonitorData = {
        name: 'Test Monitor',
        url: 'https://example.com',
        intervalSeconds: 30,
        projectId: testProject.id,
      };

      const res = await request(app)
        .post('/api/v1/monitors')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newMonitorData);

      expect(res.statusCode).toEqual(StatusCodes.CREATED);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual('Test Monitor');
      expect(res.body.url).toEqual('https://example.com');
      expect(res.body.projectId).toEqual(testProject.id);
      expect(res.body.status).toEqual(MonitorStatus.ACTIVE); // Default status
    });

    it('should return 400 if validation fails', async () => {
      const invalidMonitorData = {
        name: 'Short', // Too short
        url: 'invalid-url', // Invalid URL
        projectId: testProject.id,
      };

      const res = await request(app)
        .post('/api/v1/monitors')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidMonitorData);

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(res.body).toHaveProperty('message', 'Validation failed');
      expect(res.body.details).toBeArrayOfSize(2); // name & url errors
    });

    it('should return 400 if project does not exist or not owned by user', async () => {
      const newMonitorData = {
        name: 'Another Monitor',
        url: 'https://another.com',
        projectId: '00000000-0000-4000-8000-000000000000', // Non-existent project
      };

      const res = await request(app)
        .post('/api/v1/monitors')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newMonitorData);

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(res.body).toHaveProperty('message', 'Project not found or does not belong to you.');
    });

    it('should return 401 if no token is provided', async () => {
      const newMonitorData = {
        name: 'No Auth Monitor',
        url: 'https://noauth.com',
        projectId: testProject.id,
      };

      const res = await request(app)
        .post('/api/v1/monitors')
        .send(newMonitorData);

      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/monitors', () => {
    let monitor1: Monitor;
    let monitor2: Monitor;
    let otherUser: User;
    let otherProject: Project;
    let otherUserToken: string;

    beforeAll(async () => {
      const monitorRepo = AppDataSource.getRepository(Monitor);
      monitor1 = monitorRepo.create({
        name: 'Google',
        url: 'https://google.com',
        intervalSeconds: 60,
        projectId: testProject.id,
        status: MonitorStatus.ACTIVE,
      });
      monitor2 = monitorRepo.create({
        name: 'Bing',
        url: 'https://bing.com',
        intervalSeconds: 120,
        projectId: testProject.id,
        status: MonitorStatus.PAUSED,
      });
      await monitorRepo.save([monitor1, monitor2]);

      // Create another user and their project/monitor
      const userRepo = AppDataSource.getRepository(User);
      const hashedPassword = await hashPassword('otherpass');
      otherUser = userRepo.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: hashedPassword,
        role: UserRole.USER,
      });
      await userRepo.save(otherUser);
      otherUserToken = generateJwtToken(otherUser.id, otherUser.role);

      const projectRepo = AppDataSource.getRepository(Project);
      otherProject = projectRepo.create({
        name: 'Other Project',
        userId: otherUser.id,
      });
      await projectRepo.save(otherProject);

      const otherMonitor = monitorRepo.create({
        name: 'Other Monitor',
        url: 'https://other.com',
        projectId: otherProject.id,
      });
      await monitorRepo.save(otherMonitor);
    });

    it('should return all monitors for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/monitors')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body).toBeArrayOfSize(3); // The one created earlier + monitor1, monitor2
      expect(res.body.map((m: Monitor) => m.name)).toIncludeAllMembers(['Test Monitor', 'Google', 'Bing']);
    });

    it('should not return monitors belonging to other users', async () => {
      const res = await request(app)
        .get('/api/v1/monitors')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body).toBeArrayOfSize(1);
      expect(res.body[0].name).toEqual('Other Monitor');
      expect(res.body.map((m: Monitor) => m.name)).not.toIncludeAnyMembers(['Test Monitor', 'Google', 'Bing']);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/monitors');
      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/monitors/:id', () => {
    let monitorToFetch: Monitor;

    beforeAll(async () => {
      const monitorRepo = AppDataSource.getRepository(Monitor);
      monitorToFetch = monitorRepo.create({
        name: 'Specific Monitor',
        url: 'https://specific.com',
        intervalSeconds: 60,
        projectId: testProject.id,
        status: MonitorStatus.ACTIVE,
      });
      await monitorRepo.save(monitorToFetch);
    });

    it('should return a specific monitor if owned by the user', async () => {
      const res = await request(app)
        .get(`/api/v1/monitors/${monitorToFetch.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.id).toEqual(monitorToFetch.id);
      expect(res.body.name).toEqual('Specific Monitor');
      expect(res.body).toHaveProperty('project.id', testProject.id);
    });

    it('should return 404 if monitor does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000001';
      const res = await request(app)
        .get(`/api/v1/monitors/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 404 if monitor exists but is not owned by the user', async () => {
      const userRepo = AppDataSource.getRepository(User);
      const otherUser = userRepo.create({
        username: 'another_user',
        email: 'another@example.com',
        password: await hashPassword('anotherpass'),
        role: UserRole.USER,
      });
      await userRepo.save(otherUser);
      const otherUserToken = generateJwtToken(otherUser.id, otherUser.role);

      const res = await request(app)
        .get(`/api/v1/monitors/${monitorToFetch.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND); // Due to ownership check, it appears as not found
    });
  });

  describe('PUT /api/v1/monitors/:id', () => {
    let monitorToUpdate: Monitor;
    let otherProjectForUser: Project;

    beforeAll(async () => {
      const monitorRepo = AppDataSource.getRepository(Monitor);
      monitorToUpdate = monitorRepo.create({
        name: 'Monitor for Update',
        url: 'https://update.com',
        intervalSeconds: 60,
        projectId: testProject.id,
        status: MonitorStatus.ACTIVE,
      });
      await monitorRepo.save(monitorToUpdate);

      const projectRepo = AppDataSource.getRepository(Project);
      otherProjectForUser = projectRepo.create({
        name: 'Another Project for User',
        userId: testUser.id,
      });
      await projectRepo.save(otherProjectForUser);
    });

    it('should update a monitor if owned by the user', async () => {
      const updateData = {
        name: 'Updated Monitor Name',
        intervalSeconds: 120,
        status: MonitorStatus.PAUSED,
      };

      const res = await request(app)
        .put(`/api/v1/monitors/${monitorToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.id).toEqual(monitorToUpdate.id);
      expect(res.body.name).toEqual('Updated Monitor Name');
      expect(res.body.intervalSeconds).toEqual(120);
      expect(res.body.status).toEqual(MonitorStatus.PAUSED);

      const updatedMonitorInDb = await AppDataSource.getRepository(Monitor).findOneBy({ id: monitorToUpdate.id });
      expect(updatedMonitorInDb?.name).toEqual('Updated Monitor Name');
    });

    it('should allow moving a monitor to another project owned by the same user', async () => {
      const res = await request(app)
        .put(`/api/v1/monitors/${monitorToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ projectId: otherProjectForUser.id });

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.projectId).toEqual(otherProjectForUser.id);

      const updatedMonitorInDb = await AppDataSource.getRepository(Monitor).findOneBy({ id: monitorToUpdate.id });
      expect(updatedMonitorInDb?.projectId).toEqual(otherProjectForUser.id);
    });


    it('should return 404 if monitor does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000002';
      const res = await request(app)
        .put(`/api/v1/monitors/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Fails' });

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 404 if monitor exists but is not owned by the user', async () => {
      const userRepo = AppDataSource.getRepository(User);
      const otherUser = userRepo.create({
        username: 'another_user_2',
        email: 'another2@example.com',
        password: await hashPassword('anotherpass2'),
        role: UserRole.USER,
      });
      await userRepo.save(otherUser);
      const otherUserToken = generateJwtToken(otherUser.id, otherUser.role);

      const res = await request(app)
        .put(`/api/v1/monitors/${monitorToUpdate.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Fails' });

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 400 if new project ID is not owned by the user', async () => {
      const userRepo = AppDataSource.getRepository(User);
      const intruderUser = userRepo.create({
        username: 'intruder',
        email: 'intruder@example.com',
        password: await hashPassword('intruderpass'),
        role: UserRole.USER,
      });
      await userRepo.save(intruderUser);

      const projectRepo = AppDataSource.getRepository(Project);
      const intruderProject = projectRepo.create({
        name: 'Intruder Project',
        userId: intruderUser.id,
      });
      await projectRepo.save(intruderProject);

      const res = await request(app)
        .put(`/api/v1/monitors/${monitorToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ projectId: intruderProject.id }); // Trying to move to intruder's project

      expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
      expect(res.body).toHaveProperty('message', 'New project not found or you do not have access.');
    });
  });

  describe('DELETE /api/v1/monitors/:id', () => {
    let monitorToDelete: Monitor;

    beforeAll(async () => {
      const monitorRepo = AppDataSource.getRepository(Monitor);
      monitorToDelete = monitorRepo.create({
        name: 'Monitor to Delete',
        url: 'https://delete.com',
        intervalSeconds: 60,
        projectId: testProject.id,
        status: MonitorStatus.ACTIVE,
      });
      await monitorRepo.save(monitorToDelete);
    });

    it('should delete a monitor if owned by the user', async () => {
      const res = await request(app)
        .delete(`/api/v1/monitors/${monitorToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NO_CONTENT);

      const deletedMonitor = await AppDataSource.getRepository(Monitor).findOneBy({ id: monitorToDelete.id });
      expect(deletedMonitor).toBeNull();
    });

    it('should return 404 if monitor does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000003';
      const res = await request(app)
        .delete(`/api/v1/monitors/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 404 if monitor exists but is not owned by the user', async () => {
      const monitorRepo = AppDataSource.getRepository(Monitor);
      const anotherMonitor = monitorRepo.create({
        name: 'Another Monitor to Delete',
        url: 'https://anotherdelete.com',
        intervalSeconds: 60,
        projectId: testProject.id, // This belongs to testUser
        status: MonitorStatus.ACTIVE,
      });
      await monitorRepo.save(anotherMonitor);

      const userRepo = AppDataSource.getRepository(User);
      const otherUser = userRepo.create({
        username: 'other_deleter',
        email: 'other_deleter@example.com',
        password: await hashPassword('otherdeletepass'),
        role: UserRole.USER,
      });
      await userRepo.save(otherUser);
      const otherUserToken = generateJwtToken(otherUser.id, otherUser.role);

      const res = await request(app)
        .delete(`/api/v1/monitors/${anotherMonitor.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND); // Due to ownership check
      const notDeletedMonitor = await AppDataSource.getRepository(Monitor).findOneBy({ id: anotherMonitor.id });
      expect(notDeletedMonitor).not.toBeNull();
    });
  });

  describe('POST /api/v1/monitors/:id/check', () => {
    let monitorToTrigger: Monitor;

    beforeAll(async () => {
      const monitorRepo = AppDataSource.getRepository(Monitor);
      monitorToTrigger = monitorRepo.create({
        name: 'Triggerable Monitor',
        url: 'https://httpstat.us/200', // A reliable test URL
        intervalSeconds: 60,
        projectId: testProject.id,
        status: MonitorStatus.ACTIVE,
      });
      await monitorRepo.save(monitorToTrigger);
    });

    it('should trigger a manual monitor check if owned by the user', async () => {
      const res = await request(app)
        .post(`/api/v1/monitors/${monitorToTrigger.id}/check`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(); // No body needed

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.message).toContain('check triggered successfully');
      // Verify that checkMonitor was called (mocked)
      expect(require('../../src/jobs/monitor-scheduler').checkMonitor).toHaveBeenCalledWith(
        expect.objectContaining({ id: monitorToTrigger.id })
      );
    });

    it('should return 404 if monitor does not exist or not owned by user', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000004';
      const res = await request(app)
        .post(`/api/v1/monitors/${nonExistentId}/check`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(require('../../src/jobs/monitor-scheduler').checkMonitor).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: nonExistentId })
      );
    });
  });
});
```
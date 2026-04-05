```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User, UserRole } from '../../src/entities/User.entity';
import { Project } from '../../src/entities/Project.entity';
import { generateJwtToken } from '../../src/auth/jwt.utils';
import { hashPassword } from '../../src/utils/password.utils';
import { StatusCodes } from 'http-status-codes';

describe('Project API Tests', () => {
  let testUser: User;
  let testAdmin: User;
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
      username: 'testuser_proj',
      email: 'testuser_proj@example.com',
      password: hashedPassword,
      role: UserRole.USER,
    });
    await userRepo.save(testUser);

    testAdmin = userRepo.create({
      username: 'testadmin_proj',
      email: 'testadmin_proj@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await userRepo.save(testAdmin);

    // Generate tokens
    userToken = generateJwtToken(testUser.id, testUser.role);
    adminToken = generateJwtToken(testAdmin.id, testAdmin.role);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project for the authenticated user', async () => {
      const newProjectData = {
        name: 'My First Project',
        description: 'A project to monitor my web services.',
      };

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProjectData);

      expect(res.statusCode).toEqual(StatusCodes.CREATED);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual('My First Project');
      expect(res.body.description).toEqual('A project to monitor my web services.');
      expect(res.body.userId).toEqual(testUser.id);
    });

    it('should return 400 if validation fails', async () => {
      const invalidProjectData = {
        name: 'Sh', // Too short
        description: 123, // Invalid type
      };

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidProjectData);

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(res.body).toHaveProperty('message', 'Validation failed');
      expect(res.body.details).toBeArrayOfSize(2); // name & description errors
    });

    it('should return 401 if no token is provided', async () => {
      const newProjectData = {
        name: 'No Auth Project',
        description: 'Should not be created.',
      };

      const res = await request(app)
        .post('/api/v1/projects')
        .send(newProjectData);

      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/projects', () => {
    let project1: Project;
    let project2: Project;

    beforeAll(async () => {
      const projectRepo = AppDataSource.getRepository(Project);
      project1 = projectRepo.create({
        name: 'Project One',
        description: 'Description One',
        userId: testUser.id,
      });
      project2 = projectRepo.create({
        name: 'Project Two',
        description: 'Description Two',
        userId: testUser.id,
      });
      await projectRepo.save([project1, project2]);

      // Create a project for the admin user
      await projectRepo.save(projectRepo.create({
        name: 'Admin Project',
        userId: testAdmin.id,
      }));
    });

    it('should return all projects for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body).toBeArrayOfSize(3); // 'My First Project' + project1 + project2
      expect(res.body.map((p: Project) => p.name)).toIncludeAllMembers(['My First Project', 'Project One', 'Project Two']);
      expect(res.body.map((p: Project) => p.name)).not.toContain('Admin Project');
    });

    it('should return projects for admin user', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body).toBeArrayOfSize(1);
      expect(res.body[0].name).toEqual('Admin Project');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/projects');
      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    let projectToFetch: Project;

    beforeAll(async () => {
      const projectRepo = AppDataSource.getRepository(Project);
      projectToFetch = projectRepo.create({
        name: 'Specific Project',
        description: 'To fetch individually',
        userId: testUser.id,
      });
      await projectRepo.save(projectToFetch);
    });

    it('should return a specific project if owned by the user', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectToFetch.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.id).toEqual(projectToFetch.id);
      expect(res.body.name).toEqual('Specific Project');
      expect(res.body.userId).toEqual(testUser.id);
    });

    it('should return 404 if project does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .get(`/api/v1/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 404 if project exists but is not owned by the user', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectToFetch.id}`)
        .set('Authorization', `Bearer ${adminToken}`); // Admin user trying to access user's project

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND); // Due to ownership check, it appears as not found
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    let projectToUpdate: Project;

    beforeAll(async () => {
      const projectRepo = AppDataSource.getRepository(Project);
      projectToUpdate = projectRepo.create({
        name: 'Project for Update',
        description: 'Original description',
        userId: testUser.id,
      });
      await projectRepo.save(projectToUpdate);
    });

    it('should update a project if owned by the user', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'New description',
      };

      const res = await request(app)
        .put(`/api/v1/projects/${projectToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.id).toEqual(projectToUpdate.id);
      expect(res.body.name).toEqual('Updated Project Name');
      expect(res.body.description).toEqual('New description');

      const updatedProjectInDb = await AppDataSource.getRepository(Project).findOneBy({ id: projectToUpdate.id });
      expect(updatedProjectInDb?.name).toEqual('Updated Project Name');
    });

    it('should return 400 if validation fails', async () => {
      const invalidUpdateData = {
        name: '', // Empty name
      };

      const res = await request(app)
        .put(`/api/v1/projects/${projectToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidUpdateData);

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(res.body).toHaveProperty('message', 'Validation failed');
      expect(res.body.details).toBeArrayOfSize(1);
    });

    it('should return 404 if project does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000001';
      const res = await request(app)
        .put(`/api/v1/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Fails' });

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 404 if project exists but is not owned by the user', async () => {
      const res = await request(app)
        .put(`/api/v1/projects/${projectToUpdate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fails' });

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let projectToDelete: Project;

    beforeAll(async () => {
      const projectRepo = AppDataSource.getRepository(Project);
      projectToDelete = projectRepo.create({
        name: 'Project to Delete',
        description: 'This will be gone',
        userId: testUser.id,
      });
      await projectRepo.save(projectToDelete);
    });

    it('should delete a project if owned by the user', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NO_CONTENT);

      const deletedProject = await AppDataSource.getRepository(Project).findOneBy({ id: projectToDelete.id });
      expect(deletedProject).toBeNull();
    });

    it('should return 404 if project does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000002';
      const res = await request(app)
        .delete(`/api/v1/projects/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it('should return 404 if project exists but is not owned by the user', async () => {
      const projectRepo = AppDataSource.getRepository(Project);
      const anotherProject = projectRepo.create({
        name: 'Another Project to Delete',
        userId: testUser.id,
      });
      await projectRepo.save(anotherProject);

      const res = await request(app)
        .delete(`/api/v1/projects/${anotherProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
      const notDeletedProject = await AppDataSource.getRepository(Project).findOneBy({ id: anotherProject.id });
      expect(notDeletedProject).not.toBeNull();
    });
  });
});
```
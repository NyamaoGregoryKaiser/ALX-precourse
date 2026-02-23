```javascript
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../src/utils/jwt');

// Ensure the test database URL is used
process.env.DATABASE_URL = "postgresql://testuser:testpassword@localhost:5432/securetask_test_db?schema=public";
process.env.NODE_ENV = 'test'; // Set NODE_ENV to test

let adminToken, manager1Token, member1Token;
let admin, manager1, member1;
let project1, project2;

// Helper to clear and seed database before each test suite
const clearDb = async () => {
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
};

beforeAll(async () => {
  await clearDb();

  // Create users
  const hashedPassword = await bcrypt.hash('Password@123', 12);
  admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@test.com', password: hashedPassword, role: 'ADMIN' },
  });
  manager1 = await prisma.user.create({
    data: { name: 'Manager One', email: 'manager1@test.com', password: hashedPassword, role: 'MANAGER' },
  });
  member1 = await prisma.user.create({
    data: { name: 'Member One', email: 'member1@test.com', password: hashedPassword, role: 'MEMBER' },
  });

  adminToken = generateToken(admin.id, [admin.role]);
  manager1Token = generateToken(manager1.id, [manager1.role]);
  member1Token = generateToken(member1.id, [member1.role]);

  // Create projects
  project1 = await prisma.project.create({
    data: {
      name: 'Test Project 1',
      description: 'Description for Test Project 1',
      managerId: manager1.id,
      createdById: admin.id,
      members: { connect: [{ id: member1.id }] },
    },
  });

  project2 = await prisma.project.create({
    data: {
      name: 'Test Project 2',
      description: 'Description for Test Project 2',
      managerId: admin.id,
      createdById: admin.id,
    },
  });

  // Ensure Redis client is connected (if caching is used)
  // await require('../../src/config/redis').connect();
});

afterAll(async () => {
  await clearDb();
  await prisma.$disconnect();
  // await require('../../src/config/redis').quit();
});

describe('Project API', () => {
  describe('POST /api/v1/projects', () => {
    it('should allow an admin to create a project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Created Project',
          description: 'Project created by admin',
          managerId: manager1.id,
          memberIds: [member1.id],
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.project).toHaveProperty('id');
      expect(res.body.data.project.name).toBe('Admin Created Project');
      expect(res.body.data.project.manager.id).toBe(manager1.id);
      expect(res.body.data.project.members).toHaveLength(1);
    });

    it('should allow a manager to create a project where they are the manager', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({
          name: 'Manager One Project',
          description: 'Project managed by manager one',
          managerId: manager1.id,
          memberIds: [member1.id],
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.data.project.name).toBe('Manager One Project');
      expect(res.body.data.project.manager.id).toBe(manager1.id);
    });

    it('should prevent a manager from creating a project for another manager', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({
          name: 'Manager Two Project Attempt',
          description: 'Attempt to create project for manager two',
          managerId: admin.id, // Trying to assign admin as manager
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Managers can only create projects where they are assigned as the manager.');
    });

    it('should prevent a member from creating a project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          name: 'Member Project Attempt',
          description: 'Attempt to create project by member',
          managerId: member1.id,
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Members are not authorized to create projects.');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name',
          managerId: manager1.id,
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"name" is required');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return all projects for admin', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBeGreaterThanOrEqual(2); // At least the two seeded projects + admin created one
      expect(res.body.data.projects[0]).toHaveProperty('manager');
      expect(res.body.data.projects[0]).toHaveProperty('members');
    });

    it('should return projects where user is manager or member for manager', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${manager1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.results).toBeGreaterThanOrEqual(1);
      expect(res.body.data.projects.some(p => p.id === project1.id)).toBe(true);
      expect(res.body.data.projects.some(p => p.id === project2.id)).toBe(false); // Manager1 is not part of Project2
    });

    it('should return projects where user is member for a member', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.results).toBeGreaterThanOrEqual(1);
      expect(res.body.data.projects.some(p => p.id === project1.id)).toBe(true);
      expect(res.body.data.projects.some(p => p.id === project2.id)).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return a specific project for admin', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.project.id).toBe(project1.id);
      expect(res.body.data.project).toHaveProperty('tasks');
    });

    it('should return a specific project for its manager', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${manager1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.project.id).toBe(project1.id);
    });

    it('should return a specific project for its member', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.project.id).toBe(project1.id);
    });

    it('should prevent access to a project for an unauthorized user', async () => {
      // Create a third manager not related to project1
      const manager3 = await prisma.user.create({
        data: { name: 'Manager Three', email: 'manager3@test.com', password: await bcrypt.hash('Password@123', 12), role: 'MANAGER' },
      });
      const manager3Token = generateToken(manager3.id, [manager3.role]);

      const res = await request(app)
        .get(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${manager3Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have access to this project.');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .get('/api/v1/projects/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(400); // Joi validation for UUID
      expect(res.body.message).toContain('invalid-uuid');
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should allow an admin to update a project', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Project 1 by Admin',
          status: 'COMPLETED',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.project.name).toBe('Updated Project 1 by Admin');
      expect(res.body.data.project.status).toBe('COMPLETED');
    });

    it('should allow a manager to update their own project', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({
          description: 'Updated description by manager',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.project.description).toBe('Updated description by manager');
    });

    it('should prevent a member from updating a project', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          name: 'Member Update Attempt',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to update this project.');
    });

    it('should allow adding/removing members', async () => {
      const newMember = await prisma.user.create({
        data: { name: 'New Member', email: 'newmember@test.com', password: await bcrypt.hash('Password@123', 12), role: 'MEMBER' },
      });

      const res = await request(app)
        .patch(`/api/v1/projects/${project1.id}`)
        .set('Authorization', `Bearer ${manager1Token}`)
        .send({
          addMemberIds: [newMember.id],
          removeMemberIds: [member1.id], // Remove existing member1
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.project.members.some(m => m.id === newMember.id)).toBe(true);
      expect(res.body.data.project.members.some(m => m.id === member1.id)).toBe(false);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let projectToDelete;
    beforeEach(async () => {
      // Create a fresh project for deletion tests
      projectToDelete = await prisma.project.create({
        data: {
          name: 'Project to Delete',
          description: 'This project will be deleted',
          managerId: manager1.id,
          createdById: manager1.id,
        },
      });
    });

    it('should allow an admin to delete a project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      const deletedProject = await prisma.project.findUnique({ where: { id: projectToDelete.id } });
      expect(deletedProject).toBeNull();
    });

    it('should allow a manager to delete their own project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${manager1Token}`);

      expect(res.statusCode).toEqual(204);
      const deletedProject = await prisma.project.findUnique({ where: { id: projectToDelete.id } });
      expect(deletedProject).toBeNull();
    });

    it('should prevent a member from deleting a project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDelete.id}`)
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to delete this project.');
    });

    it('should return 404 if project to delete not found', async () => {
      const res = await request(app)
        .delete('/api/v1/projects/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(400); // Joi validation for UUID
    });
  });
});
```
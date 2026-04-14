import request from 'supertest';
import app from '../../app';
import { PrismaClient, UserRole } from '@prisma/client';
import { generateToken } from '../../utils/jwt';
import { invalidateCache } from '../../middlewares/cache.middleware';

const prisma = new PrismaClient();

describe('Project Integration Tests', () => {
  let adminToken: string;
  let member1Token: string;
  let member2Token: string;
  let adminId: string;
  let member1Id: string;
  let member2Id: string;
  let project1Id: string; // Owned by admin
  let project2Id: string; // Owned by member1

  beforeAll(async () => {
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const memberUser1 = await prisma.user.findUnique({ where: { email: 'member1@example.com' } });
    const memberUser2 = await prisma.user.findUnique({ where: { email: 'member2@example.com' } });

    if (!adminUser || !memberUser1 || !memberUser2) {
      throw new Error("Seeded users not found.");
    }

    adminId = adminUser.id;
    member1Id = memberUser1.id;
    member2Id = memberUser2.id;

    adminToken = generateToken({ userId: adminId, email: adminUser.email, role: adminUser.role });
    member1Token = generateToken({ userId: member1Id, email: memberUser1.email, role: memberUser1.role });
    member2Token = generateToken({ userId: member2Id, email: memberUser2.email, role: memberUser2.role });

    const project1 = await prisma.project.findFirst({ where: { ownerId: adminId } });
    const project2 = await prisma.project.findFirst({ where: { ownerId: member1Id } });

    if (!project1 || !project2) {
      throw new Error("Seeded projects not found for admin and member1.");
    }
    project1Id = project1.id;
    project2Id = project2.id;

    await invalidateCache('projects'); // Clear any lingering cache
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project successfully as authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          name: 'New Project by Member 1',
          description: 'A project for integration testing.',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('Project created successfully');
      expect(res.body.project).toHaveProperty('id');
      expect(res.body.project.name).toEqual('New Project by Member 1');
      expect(res.body.project.owner.id).toEqual(member1Id);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .send({ name: 'Unauthorized Project' });
      expect(res.statusCode).toEqual(401);
    });

    it('should return 400 if project name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ description: 'No name project' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Project name is required.');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should get all projects for an authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('owner');
      expect(res.body[0]).toHaveProperty('_count.tasks');
    });

    it('should get projects filtered by ownerId', async () => {
      const res = await request(app)
        .get(`/api/v1/projects?ownerId=${member1Id}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((p: any) => p.owner.id === member1Id)).toBe(true);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get a specific project by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${project1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', project1Id);
      expect(res.body).toHaveProperty('name', 'Website Redesign');
      expect(res.body).toHaveProperty('owner');
      expect(res.body).toHaveProperty('tasks'); // Should include tasks
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .get('/api/v1/projects/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Project not found.');
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should update a project by its owner', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ name: 'Updated Mobile App Project' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Project updated successfully');
      expect(res.body.project.name).toEqual('Updated Mobile App Project');
      expect(res.body.project.id).toEqual(project2Id);
    });

    it('should update a project by an admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Admin updated description' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.project.description).toEqual('Admin updated description');
    });

    it('should return 403 if user is not owner or admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project1Id}`) // Project owned by admin
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ name: 'Attempted unauthorized update' });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You are not authorized to update this project.');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .patch('/api/v1/projects/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nonexistent' });
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Project not found or you are not authorized to update it.');
    });

    it('should return 403 if non-admin tries to change ownerId', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ ownerId: member2Id });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: Only administrators can change project ownership.');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let projectToDeleteId: string;
    beforeEach(async () => {
      // Create a new project specifically for deletion tests
      const newProject = await prisma.project.create({
        data: {
          name: 'Project to Delete',
          ownerId: member1Id,
          status: 'OPEN',
        },
      });
      projectToDeleteId = newProject.id;
    });

    it('should delete a project by its owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDeleteId}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.statusCode).toEqual(204);

      const deletedProject = await prisma.project.findUnique({ where: { id: projectToDeleteId } });
      expect(deletedProject).toBeNull();
    });

    it('should delete a project by an admin', async () => {
      const anotherProject = await prisma.project.create({
        data: {
          name: 'Another Project to Delete',
          ownerId: member1Id,
          status: 'OPEN',
        },
      });
      const res = await request(app)
        .delete(`/api/v1/projects/${anotherProject.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(204);

      const deletedProject = await prisma.project.findUnique({ where: { id: anotherProject.id } });
      expect(deletedProject).toBeNull();
    });

    it('should return 403 if user is not owner or admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectToDeleteId}`)
        .set('Authorization', `Bearer ${member2Token}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You are not authorized to delete this project.');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .delete('/api/v1/projects/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Project not found or you are not authorized to delete it.');
    });
  });
});
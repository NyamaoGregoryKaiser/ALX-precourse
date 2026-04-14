import request from 'supertest';
import app from '../../app';
import { PrismaClient, TaskStatus, TaskPriority, UserRole } from '@prisma/client';
import { generateToken } from '../../utils/jwt';
import { invalidateCache } from '../../middlewares/cache.middleware';

const prisma = new PrismaClient();

describe('Task Integration Tests', () => {
  let adminToken: string;
  let member1Token: string; // Reporter, Project Owner
  let member2Token: string; // Assignee
  let adminId: string;
  let member1Id: string;
  let member2Id: string;
  let project1Id: string; // Owned by Admin
  let project2Id: string; // Owned by Member1
  let task1Id: string; // In project1, reported by Admin, assigned to Member1
  let task2Id: string; // In project2, reported by Member1, assigned to Member2

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

    const project1 = await prisma.project.findFirst({ where: { ownerId: adminId } }); // Website Redesign
    const project2 = await prisma.project.findFirst({ where: { ownerId: member1Id } }); // Mobile App Development

    if (!project1 || !project2) {
      throw new Error("Seeded projects not found for admin and member1.");
    }
    project1Id = project1.id;
    project2Id = project2.id;

    const taskInProject1 = await prisma.task.findFirst({
      where: { projectId: project1Id, reporterId: adminId, assigneeId: member1Id },
    });
    const taskInProject2 = await prisma.task.findFirst({
      where: { projectId: project2Id, reporterId: member1Id, assigneeId: member2Id },
    });

    if (!taskInProject1 || !taskInProject2) {
      throw new Error("Seeded tasks not found for project1 and project2.");
    }
    task1Id = taskInProject1.id;
    task2Id = taskInProject2.id;

    await invalidateCache('tasks');
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task successfully', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          title: 'New Task for Mobile App',
          description: 'Implement user authentication module.',
          projectId: project2Id, // Owned by member1
          assigneeId: member2Id,
          priority: TaskPriority.HIGH,
          dueDate: new Date().toISOString(),
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('Task created successfully');
      expect(res.body.task).toHaveProperty('id');
      expect(res.body.task.title).toEqual('New Task for Mobile App');
      expect(res.body.task.reporter.id).toEqual(member1Id);
      expect(res.body.task.assignee.id).toEqual(member2Id);
    });

    it('should return 400 if title or projectId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Missing title and project' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Task title and Project ID are required.');
    });

    it('should return 404 if project not found', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task in Nonexistent Project', projectId: 'nonexistentProjectId' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Project not found.');
    });

    it('should return 404 if assignee not found', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Task with Invalid Assignee', projectId: project1Id, assigneeId: 'invalidAssigneeId' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Assignee user not found.');
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should get all tasks for an authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('project');
      expect(res.body[0]).toHaveProperty('assignee');
      expect(res.body[0]).toHaveProperty('reporter');
    });

    it('should filter tasks by projectId', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks?projectId=${project1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((t: any) => t.project.id === project1Id)).toBe(true);
    });

    it('should filter tasks by assigneeId', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks?assigneeId=${member2Id}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((t: any) => t.assignee && t.assignee.id === member2Id)).toBe(true);
    });

    it('should filter tasks by status and priority', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks?status=${TaskStatus.IN_PROGRESS}&priority=${TaskPriority.HIGH}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get a specific task by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${task1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', task1Id);
      expect(res.body).toHaveProperty('title');
      expect(res.body.reporter.id).toEqual(adminId);
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Task not found.');
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update a task by its reporter', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task1Id}`) // task1 reported by Admin
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Task updated successfully');
      expect(res.body.task.status).toEqual(TaskStatus.IN_PROGRESS);
    });

    it('should update a task by its assignee', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task2Id}`) // task2 assigned to Member2
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ status: TaskStatus.DONE });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Task updated successfully');
      expect(res.body.task.status).toEqual(TaskStatus.DONE);
    });

    it('should update a task by the project owner', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task2Id}`) // task2 is in project2 owned by Member1
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ priority: TaskPriority.HIGH });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Task updated successfully');
      expect(res.body.task.priority).toEqual(TaskPriority.HIGH);
    });

    it('should update a task by an admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Admin updated task description' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.task.description).toEqual('Admin updated task description');
    });

    it('should return 403 if user is not reporter, assignee, project owner, or admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${task1Id}`) // task1 reported by Admin
        .set('Authorization', `Bearer ${member2Token}`) // member2 has no relation to task1
        .send({ status: TaskStatus.DONE });
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You are not authorized to update this task.');
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app)
        .patch('/api/v1/tasks/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Nonexistent' });
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Task not found or you are not authorized to update it.');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    let taskToDeleteId: string;
    let newProjectId: string;

    beforeEach(async () => {
      // Create a new project for these tasks
      const newProject = await prisma.project.create({
        data: {
          name: 'Project for Deletion Tasks',
          ownerId: adminId,
          status: 'OPEN',
        },
      });
      newProjectId = newProject.id;

      // Create a new task specifically for deletion tests
      const newTask = await prisma.task.create({
        data: {
          title: 'Task to Delete',
          projectId: newProjectId,
          reporterId: adminId,
          assigneeId: member1Id,
          status: 'TODO',
        },
      });
      taskToDeleteId = newTask.id;
    });

    it('should delete a task by its reporter', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`); // Admin is the reporter
      expect(res.statusCode).toEqual(204);

      const deletedTask = await prisma.task.findUnique({ where: { id: taskToDeleteId } });
      expect(deletedTask).toBeNull();
    });

    it('should delete a task by the project owner', async () => {
      const taskInMember1Project = await prisma.task.create({
        data: {
          title: 'Another Task to Delete',
          projectId: project2Id, // Owned by member1
          reporterId: member2Id, // Reported by member2
          assigneeId: member1Id,
          status: 'TODO',
        },
      });
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskInMember1Project.id}`)
        .set('Authorization', `Bearer ${member1Token}`); // Member1 is project owner
      expect(res.statusCode).toEqual(204);

      const deletedTask = await prisma.task.findUnique({ where: { id: taskInMember1Project.id } });
      expect(deletedTask).toBeNull();
    });

    it('should delete a task by an admin', async () => {
      const taskInMember2Project = await prisma.task.create({
        data: {
          title: 'Yet Another Task to Delete',
          projectId: project2Id,
          reporterId: member1Id,
          assigneeId: member2Id,
          status: 'TODO',
        },
      });
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskInMember2Project.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(204);

      const deletedTask = await prisma.task.findUnique({ where: { id: taskInMember2Project.id } });
      expect(deletedTask).toBeNull();
    });

    it('should return 403 if user is not reporter, project owner, or admin (assignee cannot delete)', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskToDeleteId}`)
        .set('Authorization', `Bearer ${member1Token}`); // member1 is assignee, not reporter or project owner for taskToDeleteId
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Forbidden: You are not authorized to delete this task.');
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app)
        .delete('/api/v1/tasks/nonexistentid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Task not found or you are not authorized to delete it.');
    });
  });
});
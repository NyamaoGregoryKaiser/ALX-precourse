import { PrismaClient, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import * as taskService from '../../modules/task/task.service';
import { CustomError } from '../../middlewares/error.middleware';

// Mock PrismaClient
const prisma = new PrismaClient();
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    TaskPriority: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
    TaskStatus: { TODO: 'TODO', IN_PROGRESS: 'IN_PROGRESS', DONE: 'DONE' },
    UserRole: { ADMIN: 'ADMIN', MEMBER: 'MEMBER' },
  };
});

const mockReporter = { id: 'reporter1', firstName: 'Reporter', lastName: 'User', email: 'reporter@example.com', role: UserRole.MEMBER, password: 'hashed' };
const mockAssignee = { id: 'assignee1', firstName: 'Assignee', lastName: 'User', email: 'assignee@example.com', role: UserRole.MEMBER, password: 'hashed' };
const mockProjectOwner = { id: 'projOwner1', firstName: 'Project', lastName: 'Owner', email: 'projowner@example.com', role: UserRole.MEMBER, password: 'hashed' };
const mockAdmin = { id: 'admin1', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: UserRole.ADMIN, password: 'hashed' };

const mockProject = {
  id: 'proj123',
  name: 'Test Project',
  description: 'Test project description',
  status: 'OPEN',
  ownerId: mockProjectOwner.id,
  owner: mockProjectOwner,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTask = {
  id: 'task123',
  title: 'Test Task',
  description: 'Description of test task',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: null,
  projectId: mockProject.id,
  assigneeId: mockAssignee.id,
  reporterId: mockReporter.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  project: { id: mockProject.id, name: mockProject.name },
  assignee: { id: mockAssignee.id, firstName: mockAssignee.firstName, lastName: mockAssignee.lastName },
  reporter: { id: mockReporter.id, firstName: mockReporter.firstName, lastName: mockReporter.lastName },
};

describe('Task Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAssignee); // For assignee check
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await taskService.createTask({
        title: 'New Task',
        projectId: mockProject.id,
        reporterId: mockReporter.id,
        assigneeId: mockAssignee.id,
      });

      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: mockProject.id } });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockAssignee.id } });
      expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          title: 'New Task',
          projectId: mockProject.id,
          reporterId: mockReporter.id,
          assigneeId: mockAssignee.id,
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
        },
      }));
      expect(result).toEqual(mockTask);
    });

    it('should throw CustomError if project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(taskService.createTask({
        title: 'New Task',
        projectId: 'nonexistent',
        reporterId: mockReporter.id,
      })).rejects.toThrow(new CustomError('Project not found.', 404));
    });

    it('should throw CustomError if assignee not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(taskService.createTask({
        title: 'New Task',
        projectId: mockProject.id,
        reporterId: mockReporter.id,
        assigneeId: 'nonexistentAssignee',
      })).rejects.toThrow(new CustomError('Assignee user not found.', 404));
    });
  });

  describe('getTasks', () => {
    it('should return all tasks', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
      const result = await taskService.getTasks();
      expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result).toEqual([mockTask]);
    });

    it('should filter tasks by projectId', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
      const result = await taskService.getTasks({ projectId: mockProject.id });
      expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: mockProject.id } }));
      expect(result).toEqual([mockTask]);
    });

    it('should filter tasks by assigneeId', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
      const result = await taskService.getTasks({ assigneeId: mockAssignee.id });
      expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { assigneeId: mockAssignee.id } }));
      expect(result).toEqual([mockTask]);
    });
  });

  describe('getTaskById', () => {
    it('should return a task by ID', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      const result = await taskService.getTaskById('task123');
      expect(prisma.task.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'task123' } }));
      expect(result).toEqual(mockTask);
    });

    it('should return null if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await taskService.getTaskById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update a task by reporter', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockReporter);
      (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, title: 'Updated Title' });

      const result = await taskService.updateTask('task123', { title: 'Updated Title' }, mockReporter.id);
      expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'task123' },
        data: { title: 'Updated Title' },
      }));
      expect(result).toEqual(expect.objectContaining({ title: 'Updated Title' }));
    });

    it('should update a task by assignee', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockAssignee);
      (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, status: TaskStatus.DONE });

      const result = await taskService.updateTask('task123', { status: TaskStatus.DONE }, mockAssignee.id);
      expect(result).toEqual(expect.objectContaining({ status: TaskStatus.DONE }));
    });

    it('should update a task by project owner', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockProjectOwner);
      (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, description: 'New Description' });

      const result = await taskService.updateTask('task123', { description: 'New Description' }, mockProjectOwner.id);
      expect(result).toEqual(expect.objectContaining({ description: 'New Description' }));
    });

    it('should update a task by admin', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockAdmin);
      (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, priority: TaskPriority.HIGH });

      const result = await taskService.updateTask('task123', { priority: TaskPriority.HIGH }, mockAdmin.id);
      expect(result).toEqual(expect.objectContaining({ priority: TaskPriority.HIGH }));
    });

    it('should throw CustomError if not authorized', async () => {
      const otherUser = { id: 'otherUser', firstName: 'Other', lastName: 'User', email: 'other@example.com', role: UserRole.MEMBER, password: 'hashed' };
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(otherUser);

      await expect(taskService.updateTask('task123', { title: 'Unauthorized' }, otherUser.id)).rejects.toThrow(
        new CustomError('Forbidden: You are not authorized to update this task.', 403)
      );
    });

    it('should return null if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const result = await taskService.updateTask('nonexistent', { title: 'Test' }, mockReporter.id);
      expect(result).toBeNull();
    });

    it('should throw CustomError if user not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null); // User ID passed does not exist

      await expect(taskService.updateTask('task123', { title: 'Test' }, 'nonexistentUser')).rejects.toThrow(
        new CustomError('User not found.', 404)
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task by reporter', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockReporter);
      (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      const result = await taskService.deleteTask('task123', mockReporter.id);
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task123' }, select: { id: true, projectId: true } });
      expect(result).toEqual(expect.objectContaining({ id: mockTask.id }));
    });

    it('should delete a task by project owner', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockProjectOwner);
      (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      const result = await taskService.deleteTask('task123', mockProjectOwner.id);
      expect(result).toEqual(expect.objectContaining({ id: mockTask.id }));
    });

    it('should delete a task by admin', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockAdmin);
      (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      const result = await taskService.deleteTask('task123', mockAdmin.id);
      expect(result).toEqual(expect.objectContaining({ id: mockTask.id }));
    });

    it('should throw CustomError if not authorized (assignee cannot delete)', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockAssignee);

      await expect(taskService.deleteTask('task123', mockAssignee.id)).rejects.toThrow(
        new CustomError('Forbidden: You are not authorized to delete this task.', 403)
      );
    });

    it('should return null if task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const result = await taskService.deleteTask('nonexistent', mockReporter.id);
      expect(result).toBeNull();
    });

    it('should throw CustomError if user not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTask, project: mockProject });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(taskService.deleteTask('task123', 'nonexistentUser')).rejects.toThrow(
        new CustomError('User not found.', 404)
      );
    });
  });
});
import { PrismaClient, ProjectStatus, UserRole } from '@prisma/client';
import * as projectService from '../../modules/project/project.service';
import { CustomError } from '../../middlewares/error.middleware';

// Mock PrismaClient
const prisma = new PrismaClient();
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    task: {
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    ProjectStatus: { OPEN: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' },
    UserRole: { ADMIN: 'ADMIN', MEMBER: 'MEMBER' },
  };
});

const mockUser = {
  id: 'owner123',
  email: 'owner@example.com',
  firstName: 'Project',
  lastName: 'Owner',
  role: UserRole.MEMBER,
  password: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdminUser = {
  id: 'admin123',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.ADMIN,
  password: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProject = {
  id: 'proj123',
  name: 'Test Project',
  description: 'Description for test project',
  status: ProjectStatus.OPEN,
  ownerId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  owner: mockUser,
  _count: { tasks: 0 },
};

describe('Project Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      (prisma.project.create as jest.Mock).mockResolvedValue(mockProject);
      const result = await projectService.createProject({
        name: 'New Project',
        description: 'New project description',
        ownerId: mockUser.id,
      });
      expect(prisma.project.create).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          name: 'New Project',
          description: 'New project description',
          ownerId: mockUser.id,
          status: ProjectStatus.OPEN,
        },
      }));
      expect(result).toEqual(mockProject);
    });
  });

  describe('getProjects', () => {
    it('should return all projects with owner info and task count', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      const result = await projectService.getProjects();
      expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        include: {
          owner: { select: expect.any(Object) },
          _count: { select: { tasks: true } },
        },
      }));
      expect(result).toEqual([mockProject]);
    });

    it('should filter projects by ownerId', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      const result = await projectService.getProjects({ ownerId: mockUser.id });
      expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { ownerId: mockUser.id },
      }));
      expect(result).toEqual([mockProject]);
    });

    it('should filter projects by status', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      const result = await projectService.getProjects({ status: 'OPEN' });
      expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: ProjectStatus.OPEN },
      }));
      expect(result).toEqual([mockProject]);
    });
  });

  describe('getProjectById', () => {
    it('should return a project by ID with owner and tasks', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      const result = await projectService.getProjectById('proj123');
      expect(prisma.project.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'proj123' },
        include: { owner: expect.any(Object), tasks: expect.any(Object) },
      }));
      expect(result).toEqual(mockProject);
    });

    it('should return null if project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await projectService.getProjectById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update a project by owner', async () => {
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject) // For finding the project
        .mockResolvedValueOnce(mockUser);   // For finding the user
      (prisma.project.update as jest.Mock).mockResolvedValue({ ...mockProject, name: 'Updated Project' });

      const result = await projectService.updateProject('proj123', { name: 'Updated Project' }, mockUser.id);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: 'proj123' }, include: { owner: true } });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(prisma.project.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'proj123' },
        data: { name: 'Updated Project' },
      }));
      expect(result).toEqual(expect.objectContaining({ name: 'Updated Project' }));
    });

    it('should update a project by admin', async () => {
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockAdminUser);
      (prisma.project.update as jest.Mock).mockResolvedValue({ ...mockProject, name: 'Admin Updated Project' });

      const result = await projectService.updateProject('proj123', { name: 'Admin Updated Project' }, mockAdminUser.id);
      expect(result).toEqual(expect.objectContaining({ name: 'Admin Updated Project' }));
    });

    it('should throw CustomError if not authorized (neither owner nor admin)', async () => {
      const otherUser = { ...mockUser, id: 'otherUser', email: 'other@example.com' };
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(otherUser);

      await expect(projectService.updateProject('proj123', { name: 'Unauthorized Update' }, otherUser.id)).rejects.toThrow(
        new CustomError('Forbidden: You are not authorized to update this project.', 403)
      );
    });

    it('should throw CustomError if user not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(projectService.updateProject('proj123', { name: 'Test' }, 'nonexistentUser')).rejects.toThrow(
        new CustomError('User not found.', 404)
      );
    });

    it('should throw CustomError if non-admin tries to change ownerId', async () => {
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockUser);
      await expect(projectService.updateProject('proj123', { ownerId: 'newOwnerId' }, mockUser.id)).rejects.toThrow(
        new CustomError('Forbidden: Only administrators can change project ownership.', 403)
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete a project by owner', async () => {
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockUser);
      (prisma.task.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      const result = await projectService.deleteProject('proj123', mockUser.id);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: 'proj123' }, include: { owner: true } });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(prisma.task.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'proj123' } });
      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj123' } });
      expect(result).toEqual(mockProject);
    });

    it('should delete a project by admin', async () => {
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockAdminUser);
      (prisma.task.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      const result = await projectService.deleteProject('proj123', mockAdminUser.id);
      expect(result).toEqual(mockProject);
    });

    it('should throw CustomError if not authorized (neither owner nor admin)', async () => {
      const otherUser = { ...mockUser, id: 'otherUser', email: 'other@example.com' };
      (prisma.project.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(otherUser);

      await expect(projectService.deleteProject('proj123', otherUser.id)).rejects.toThrow(
        new CustomError('Forbidden: You are not authorized to delete this project.', 403)
      );
    });

    it('should return null if project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const result = await projectService.deleteProject('nonexistent', mockUser.id);
      expect(result).toBeNull();
    });

    it('should throw CustomError if user not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(projectService.deleteProject('proj123', 'nonexistentUser')).rejects.toThrow(
        new CustomError('User not found.', 404)
      );
    });
  });
});
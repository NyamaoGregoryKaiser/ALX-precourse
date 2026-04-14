import { PrismaClient, ProjectStatus } from '@prisma/client';
import { CustomError } from '../../middlewares/error.middleware';

const prisma = new PrismaClient();

interface CreateProjectData {
  name: string;
  description?: string;
  ownerId: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  ownerId?: string; // Only allow ADMIN to change owner
}

interface GetProjectsFilter {
  ownerId?: string;
  status?: string;
}

export const createProject = async (data: CreateProjectData) => {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      status: ProjectStatus.OPEN, // Default status
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  return project;
};

export const getProjects = async (filter: GetProjectsFilter = {}) => {
  const where: any = {};
  if (filter.ownerId) {
    where.ownerId = filter.ownerId;
  }
  if (filter.status) {
    where.status = filter.status.toUpperCase(); // Ensure status is uppercase for enum
  }

  return prisma.project.findMany({
    where,
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getProjectById = async (id: string) => {
  return prisma.project.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

export const updateProject = async (id: string, updateData: UpdateProjectData, userId: string) => {
  const project = await prisma.project.findUnique({ where: { id }, include: { owner: true } });
  if (!project) {
    return null; // Project not found
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new CustomError('User not found.', 404);
  }

  // Authorization: Only owner or ADMIN can update
  if (project.ownerId !== userId && user.role !== 'ADMIN') {
    throw new CustomError('Forbidden: You are not authorized to update this project.', 403);
  }

  // Prevent non-admins from changing project owner
  if (updateData.ownerId && updateData.ownerId !== project.ownerId && user.role !== 'ADMIN') {
    throw new CustomError('Forbidden: Only administrators can change project ownership.', 403);
  }

  return prisma.project.update({
    where: { id },
    data: updateData,
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

export const deleteProject = async (id: string, userId: string) => {
  const project = await prisma.project.findUnique({ where: { id }, include: { owner: true } });
  if (!project) {
    return null; // Project not found
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new CustomError('User not found.', 404);
  }

  // Authorization: Only owner or ADMIN can delete
  if (project.ownerId !== userId && user.role !== 'ADMIN') {
    throw new CustomError('Forbidden: You are not authorized to delete this project.', 403);
  }

  // Delete all associated tasks first (cascading delete not enabled for tasks)
  await prisma.task.deleteMany({
    where: { projectId: id },
  });

  return prisma.project.delete({
    where: { id },
  });
};
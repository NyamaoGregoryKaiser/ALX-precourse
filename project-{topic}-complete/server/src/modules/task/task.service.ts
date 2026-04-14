import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';
import { CustomError } from '../../middlewares/error.middleware';

const prisma = new PrismaClient();

interface CreateTaskData {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  projectId?: string;
  assigneeId?: string | null; // Allow setting assignee to null
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
}

interface GetTasksFilter {
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
}

export const createTask = async (data: CreateTaskData) => {
  // Check if project exists
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) {
    throw new CustomError('Project not found.', 404);
  }

  // Check if assignee exists if provided
  if (data.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
    if (!assignee) {
      throw new CustomError('Assignee user not found.', 404);
    }
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      reporterId: data.reporterId,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      priority: data.priority || TaskPriority.MEDIUM,
      status: data.status || TaskStatus.TODO,
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
      reporter: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return task;
};

export const getTasks = async (filter: GetTasksFilter = {}) => {
  const where: any = {};
  if (filter.projectId) {
    where.projectId = filter.projectId;
  }
  if (filter.assigneeId) {
    where.assigneeId = filter.assigneeId;
  }
  if (filter.status) {
    where.status = filter.status.toUpperCase();
  }
  if (filter.priority) {
    where.priority = filter.priority.toUpperCase();
  }

  return prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
      reporter: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getTaskById = async (id: string) => {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
      reporter: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

export const updateTask = async (id: string, updateData: UpdateTaskData, userId: string) => {
  const task = await prisma.task.findUnique({ where: { id }, include: { project: { include: { owner: true } } } });
  if (!task) {
    return null; // Task not found
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new CustomError('User not found.', 404);
  }

  // Authorization: Only reporter, assignee, project owner, or ADMIN can update
  if (
    task.reporterId !== userId &&
    task.assigneeId !== userId &&
    task.project.ownerId !== userId &&
    user.role !== 'ADMIN'
  ) {
    throw new CustomError('Forbidden: You are not authorized to update this task.', 403);
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
      reporter: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

export const deleteTask = async (id: string, userId: string) => {
  const task = await prisma.task.findUnique({ where: { id }, include: { project: { include: { owner: true } } } });
  if (!task) {
    return null; // Task not found
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new CustomError('User not found.', 404);
  }

  // Authorization: Only reporter, project owner, or ADMIN can delete
  // Assignee cannot delete the task, only mark it as done.
  if (
    task.reporterId !== userId &&
    task.project.ownerId !== userId &&
    user.role !== 'ADMIN'
  ) {
    throw new CustomError('Forbidden: You are not authorized to delete this task.', 403);
  }

  return prisma.task.delete({
    where: { id },
    select: { id: true, projectId: true }, // Return minimal info including projectId for cache invalidation
  });
};
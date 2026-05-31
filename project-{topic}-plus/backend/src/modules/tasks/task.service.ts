import prisma from '../../config/prisma';
import { AppError } from '../../utils/appError';
import { StatusCodes } from 'http-status-codes';
import { Task, Role } from '@prisma/client';
import { clearCache } from '../../middleware/cacheMiddleware';

const TASK_CACHE_PATTERN = '/api/v1/tasks';
const PROJECT_CACHE_PATTERN = '/api/v1/projects'; // Also clear project caches

/**
 * Creates a new task within a project.
 * @param taskData Task data including projectId and optional assignedToId.
 * @returns The created task.
 */
export async function createTask(
  taskData: {
    title: string;
    description?: string;
    dueDate?: Date;
    status?: string;
    priority?: string;
    projectId: string;
    assignedToId?: string;
  }
): Promise<Task> {
  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id: taskData.projectId } });
  if (!project) {
    throw new AppError('Project not found.', StatusCodes.BAD_REQUEST);
  }

  // Verify assignedTo user exists if provided
  if (taskData.assignedToId) {
    const assignedTo = await prisma.user.findUnique({ where: { id: taskData.assignedToId } });
    if (!assignedTo) {
      throw new AppError('Assigned user not found.', StatusCodes.BAD_REQUEST);
    }
  }

  const newTask = await prisma.task.create({
    data: {
      ...taskData,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
    },
  });

  clearCache(TASK_CACHE_PATTERN);
  clearCache(`${PROJECT_CACHE_PATTERN}/${taskData.projectId}`); // Clear project cache as tasks are nested
  return newTask;
}

/**
 * Retrieves all tasks, optionally filtered by project or assigned user.
 * @param query Query parameters for filtering (projectId, assignedToId).
 * @param userId User's ID for authorization (e.g., MEMBER can only see their tasks).
 * @param userRole User's role for authorization logic.
 * @returns An array of tasks.
 */
export async function getAllTasks(
  query: { projectId?: string; assignedToId?: string },
  userId: string,
  userRole: Role
): Promise<Task[]> {
  const whereClause: any = {};

  if (query.projectId) {
    whereClause.projectId = query.projectId;
  }
  if (query.assignedToId) {
    whereClause.assignedToId = query.assignedToId;
  }

  // Enforce visibility for MEMBER role: can only see tasks assigned to them
  if (userRole === Role.MEMBER) {
    whereClause.assignedToId = userId;
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: { project: true, assignedTo: true },
  });
  return tasks;
}

/**
 * Retrieves a single task by ID.
 * @param id Task ID.
 * @returns The task or null if not found.
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: true, assignedTo: true },
  });
  if (!task) {
    throw new AppError('Task not found', StatusCodes.NOT_FOUND);
  }
  return task;
}

/**
 * Updates an existing task.
 * @param id Task ID.
 * @param updateData Data to update.
 * @returns The updated task.
 */
export async function updateTask(id: string, updateData: Partial<Task>): Promise<Task> {
  const existingTask = await prisma.task.findUnique({ where: { id } });
  if (!existingTask) {
    throw new AppError('Task not found', StatusCodes.NOT_FOUND);
  }

  // Verify projectId if being updated
  if (updateData.projectId) {
    const project = await prisma.project.findUnique({ where: { id: updateData.projectId } });
    if (!project) {
      throw new AppError('Project for task not found.', StatusCodes.BAD_REQUEST);
    }
  }

  // Verify assignedTo user exists if being updated
  if (updateData.assignedToId) {
    const assignedTo = await prisma.user.findUnique({ where: { id: updateData.assignedToId } });
    if (!assignedTo) {
      throw new AppError('Assigned user for task not found.', StatusCodes.BAD_REQUEST);
    }
  } else if (updateData.assignedToId === null) {
    // Allow unassigning a task
    updateData.assignedToId = null;
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      ...updateData,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
    },
  });

  clearCache(TASK_CACHE_PATTERN);
  clearCache(`/api/v1/tasks/${id}`);
  if (existingTask.projectId) clearCache(`${PROJECT_CACHE_PATTERN}/${existingTask.projectId}`);
  if (updatedTask.projectId && updatedTask.projectId !== existingTask.projectId) clearCache(`${PROJECT_CACHE_PATTERN}/${updatedTask.projectId}`);
  return updatedTask;
}

/**
 * Deletes a task by ID.
 * @param id Task ID.
 */
export async function deleteTask(id: string): Promise<void> {
  const existingTask = await prisma.task.findUnique({ where: { id } });
  if (!existingTask) {
    throw new AppError('Task not found', StatusCodes.NOT_FOUND);
  }

  await prisma.task.delete({
    where: { id },
  });
  clearCache(TASK_CACHE_PATTERN);
  clearCache(`/api/v1/tasks/${id}`);
  if (existingTask.projectId) clearCache(`${PROJECT_CACHE_PATTERN}/${existingTask.projectId}`);
}
```
import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import { TaskStatus } from '@prisma/client';

/**
 * Creates a new task within a project.
 * @param {string} projectId - ID of the project the task belongs to.
 * @param {object} taskData - Data for the new task.
 * @returns {Promise<object>} Created task object.
 * @throws {AppError} If project not found or invalid task data.
 */
const createTask = async (projectId, taskData) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new AppError('Project not found.', 404);
  }

  // Validate assignee if provided
  if (taskData.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: taskData.assigneeId } });
    if (!assignee) {
      throw new AppError('Assignee user not found.', 404);
    }
    // Optionally, check if assignee is part of the project's team if applicable
    if (project.teamId) {
      const isTeamMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: taskData.assigneeId, teamId: project.teamId } },
      });
      if (!isTeamMember) {
        throw new AppError('Assignee is not a member of the project\'s team.', 400);
      }
    }
  }

  const newTask = await prisma.task.create({
    data: {
      ...taskData,
      projectId,
      status: taskData.status || TaskStatus.TODO, // Default status
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, username: true } },
    },
  });
  logger.info(`Task created: ${newTask.title} in project ${project.name}`);
  return newTask;
};

/**
 * Retrieves all tasks.
 * @param {object} queryOptions - Options for filtering, sorting, pagination.
 * @returns {Promise<Array>} List of tasks.
 */
const getAllTasks = async (queryOptions) => {
  const tasks = await prisma.task.findMany({
    ...queryOptions,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, username: true, email: true } },
      _count: { select: { comments: true, attachments: true } }
    },
  });
  return tasks;
};

/**
 * Retrieves a single task by ID.
 * @param {string} taskId - ID of the task.
 * @returns {Promise<object>} Task object.
 * @throws {AppError} If task not found.
 */
const getTaskById = async (taskId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      comments: { // Include comments
        include: { author: { select: { id: true, username: true, firstName: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: { // Include attachments
        select: { id: true, filename: true, fileUrl: true, uploadedAt: true },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found.', 404);
  }
  return task;
};

/**
 * Updates a task.
 * @param {string} taskId - ID of the task to update.
 * @param {object} updateData - Data to update.
 * @returns {Promise<object>} Updated task object.
 * @throws {AppError} If task not found or invalid status.
 */
const updateTask = async (taskId, updateData) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  // Validate status if provided
  if (updateData.status && !Object.values(TaskStatus).includes(updateData.status)) {
    throw new AppError('Invalid task status.', 400);
  }

  // Validate assignee if provided
  if (updateData.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: updateData.assigneeId } });
    if (!assignee) {
      throw new AppError('Assignee user not found.', 404);
    }
    // Optionally, check if assignee is part of the project's team if applicable
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { teamId: true } });
    if (project?.teamId) {
      const isTeamMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: updateData.assigneeId, teamId: project.teamId } },
      });
      if (!isTeamMember) {
        throw new AppError('Assignee is not a member of the project\'s team.', 400);
      }
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, username: true } },
    },
  });
  logger.info(`Task updated: ${updatedTask.title}`);
  return updatedTask;
};

/**
 * Deletes a task.
 * @param {string} taskId - ID of the task to delete.
 * @returns {Promise<void>}
 * @throws {AppError} If task not found.
 */
const deleteTask = async (taskId) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  // Prisma will automatically handle cascading deletes for comments and attachments.
  await prisma.task.delete({ where: { id: taskId } });
  logger.info(`Task deleted: ${taskId}`);
};


export default {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
```

```javascript
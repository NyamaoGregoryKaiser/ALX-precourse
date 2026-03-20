const prisma = require('../../prisma/client');
const logger = require('../utils/logger');
const { invalidateCacheByPattern } = require('./cache.service');
const { CACHE_KEYS } = require('../config/constants'); // Added for cache invalidation pattern

/**
 * Create a new task
 * @param {object} taskData - Task details
 * @param {string} creatorId - ID of the user creating the task
 * @returns {Promise<object>} - Created task object
 */
const createTask = async (taskData, creatorId) => {
  const newTask = await prisma.task.create({
    data: {
      ...taskData,
      creatorId: creatorId
    }
  });
  await invalidateCacheByPattern(`${CACHE_KEYS.PROJECT_BY_ID(taskData.projectId)}*`); // Invalidate project cache
  logger.info(`Task created: ${newTask.title} in project ${newTask.projectId}`);
  return newTask;
};

/**
 * Get all tasks, optionally filtered by project, assignee, or creator
 * @param {object} filters - Filter criteria (e.g., projectId, assignedToId, creatorId)
 * @returns {Promise<Array<object>>} - List of tasks
 */
const getAllTasks = async (filters) => {
  const { projectId, assignedToId, creatorId, status } = filters;
  const whereClause = {
    ...(projectId && { projectId }),
    ...(assignedToId && { assignedToId }),
    ...(creatorId && { creatorId }),
    ...(status && { status })
  };

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      project: {
        select: { id: true, name: true }
      },
      assignedTo: {
        select: { id: true, username: true }
      },
      creator: {
        select: { id: true, username: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  return tasks;
};

/**
 * Get a task by ID
 * @param {string} taskId - ID of the task
 * @returns {Promise<object | null>} - Task object or null if not found
 */
const getTaskById = async (taskId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { id: true, name: true }
      },
      assignedTo: {
        select: { id: true, username: true, email: true }
      },
      creator: {
        select: { id: true, username: true, email: true }
      }
    }
  });
  return task;
};

/**
 * Update a task
 * @param {string} taskId - ID of the task to update
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Updated task object
 */
const updateTask = async (taskId, updateData) => {
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData
  });
  await invalidateCacheByPattern(`${CACHE_KEYS.PROJECT_BY_ID(updatedTask.projectId)}*`); // Invalidate project cache
  logger.info(`Task ${taskId} updated.`);
  return updatedTask;
};

/**
 * Delete a task
 * @param {string} taskId - ID of the task to delete
 * @returns {Promise<object>} - Deleted task object
 */
const deleteTask = async (taskId) => {
  const deletedTask = await prisma.task.delete({
    where: { id: taskId }
  });
  await invalidateCacheByPattern(`${CACHE_KEYS.PROJECT_BY_ID(deletedTask.projectId)}*`); // Invalidate project cache
  logger.info(`Task ${taskId} deleted.`);
  return deletedTask;
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask
};
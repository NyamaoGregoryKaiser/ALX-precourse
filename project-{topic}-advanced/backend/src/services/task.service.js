const httpStatus = require('http-status');
const { Task, User, Project } = require('../db/models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger.config');
const { getRedisClient } = require('../config/redis.config');

const TASK_CACHE_KEY_PREFIX = 'task:';
const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

const invalidateTaskCache = async (taskId) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.del(`${TASK_CACHE_KEY_PREFIX}${taskId}`);
    // Invalidate list caches if needed (e.g., if there were specific task list caches)
    logger.debug(`Task cache invalidated for task ID: ${taskId}`);
  } catch (error) {
    logger.error('Error invalidating task cache:', error);
  }
};

const createTask = async (taskBody) => {
  const task = await Task.create(taskBody);
  await invalidateTaskCache(task.id); // Invalidate cache on creation
  return task;
};

const queryTasks = async (filter, options) => {
  const { sortBy, limit, page } = options;
  const offset = (page - 1) * limit;

  const tasks = await Task.findAndCountAll({
    where: filter,
    order: sortBy ? [sortBy.split(':')] : [['createdAt', 'DESC']],
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    include: [
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'status'],
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  return {
    results: tasks.rows,
    totalResults: tasks.count,
    limit: parseInt(limit, 10) || tasks.count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(tasks.count / (parseInt(limit, 10) || tasks.count)),
  };
};

const getTaskById = async (taskId) => {
  try {
    const redisClient = getRedisClient();
    const cachedTask = await redisClient.get(`${TASK_CACHE_KEY_PREFIX}${taskId}`);
    if (cachedTask) {
      logger.debug(`Task ${taskId} retrieved from cache.`);
      return JSON.parse(cachedTask);
    }
  } catch (error) {
    logger.warn(`Failed to retrieve task ${taskId} from cache:`, error.message);
  }

  const task = await Task.findByPk(taskId, {
    include: [
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'status'],
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  if (task) {
    try {
      const redisClient = getRedisClient();
      await redisClient.set(`${TASK_CACHE_KEY_PREFIX}${taskId}`, JSON.stringify(task), {
        EX: CACHE_EXPIRATION_SECONDS,
      });
      logger.debug(`Task ${taskId} stored in cache.`);
    } catch (error) {
      logger.error(`Failed to store task ${taskId} in cache:`, error);
    }
  } else {
    logger.warn(`Task with ID ${taskId} not found.`);
  }

  return task;
};

const updateTaskById = async (taskId, updateBody) => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  Object.assign(task, updateBody);
  await task.save();
  await invalidateTaskCache(taskId); // Invalidate cache on update
  return task;
};

const deleteTaskById = async (taskId) => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  await task.destroy();
  await invalidateTaskCache(taskId); // Invalidate cache on delete
};

module.exports = {
  createTask,
  queryTasks,
  getTaskById,
  updateTaskById,
  deleteTaskById,
  invalidateTaskCache,
};
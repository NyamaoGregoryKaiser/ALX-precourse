const httpStatus = require('http-status');
const { Task } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Create a task
 * @param {Object} taskBody
 * @returns {Promise<Task>}
 */
const createTask = async (taskBody) => {
  const task = await Task.create(taskBody);
  logger.info(`Task created: ${task.title} for project: ${task.projectId}`);
  return task;
};

/**
 * Query for tasks
 * @param {Object} filter - Sequelize filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTasks = async (filter, options) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const offset = (page - 1) * limit;

  const order = [];
  if (sortBy) {
    const [field, sortOrder] = sortBy.split(':');
    order.push([field, sortOrder.toUpperCase()]);
  } else {
    order.push(['createdAt', 'ASC']);
  }

  const { count, rows: tasks } = await Task.findAndCountAll({
    where: filter,
    order,
    limit,
    offset,
  });

  return {
    results: tasks,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
    totalResults: count,
  };
};

/**
 * Get task by id
 * @param {string} taskId
 * @returns {Promise<Task>}
 */
const getTaskById = async (taskId) => {
  return Task.findByPk(taskId);
};

/**
 * Update task by id
 * @param {string} taskId
 * @param {Object} updateBody
 * @returns {Promise<Task>}
 */
const updateTaskById = async (taskId, updateBody) => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  Object.assign(task, updateBody);
  await task.save();
  logger.info(`Task updated: ${task.title} (ID: ${taskId})`);
  return task;
};

/**
 * Delete task by id
 * @param {string} taskId
 * @returns {Promise<Task>}
 */
const deleteTaskById = async (taskId) => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  await task.destroy();
  logger.info(`Task deleted: ${taskId}`);
  return task;
};

module.exports = {
  createTask,
  queryTasks,
  getTaskById,
  updateTaskById,
  deleteTaskById,
};
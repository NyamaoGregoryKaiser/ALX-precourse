const { Task, Project, User } = require('../models');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const TASK_CACHE_KEY = 'all_tasks';

const createTask = async (title, description, status, priority, dueDate, projectId, assignedTo, creatorId) => {
  // Check if project exists
  const project = await Project.findByPk(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Check if assigned user exists (if provided)
  if (assignedTo) {
    const assignee = await User.findByPk(assignedTo);
    if (!assignee) {
      throw new AppError('Assigned user not found', 404);
    }
  }

  const task = await Task.create({
    title, description, status, priority, dueDate, projectId, assignedTo, creatorId
  });
  cache.del(TASK_CACHE_KEY); // Invalidate all tasks cache
  cache.del(`${TASK_CACHE_KEY}_project_${projectId}`); // Invalidate project specific task cache
  logger.info(`Task created: ${task.id} in project ${projectId}`);
  return task;
};

const getTasks = async (filters = {}) => {
  const { projectId, assignedTo, status, priority, dueDate, search } = filters;
  const whereClause = {};

  if (projectId) whereClause.projectId = projectId;
  if (assignedTo) whereClause.assignedTo = assignedTo;
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;

  if (dueDate) {
    // Basic date filtering, could be expanded for ranges
    whereClause.dueDate = {
      [require('sequelize').Op.gte]: new Date(dueDate)
    };
  }

  if (search) {
    whereClause.title = {
      [require('sequelize').Op.iLike]: `%${search}%`
    };
  }

  const cacheKey = `${TASK_CACHE_KEY}_${JSON.stringify(filters)}`;
  const cachedTasks = cache.get(cacheKey);
  if (cachedTasks) {
    return cachedTasks;
  }

  const tasks = await Task.findAll({
    where: whereClause,
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
      { model: User, as: 'creator', attributes: ['id', 'username', 'email'] }
    ],
    order: [['dueDate', 'ASC'], ['priority', 'DESC'], ['createdAt', 'ASC']] // Example sorting
  });
  cache.set(cacheKey, tasks);
  return tasks;
};

const getTaskById = async (id) => {
  const cachedTask = cache.get(`${TASK_CACHE_KEY}_${id}`);
  if (cachedTask) {
    return cachedTask;
  }

  const task = await Task.findByPk(id, {
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
      { model: User, as: 'creator', attributes: ['id', 'username', 'email'] }
    ]
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }
  cache.set(`${TASK_CACHE_KEY}_${id}`, task);
  return task;
};

const updateTask = async (id, taskData, userId) => {
  const task = await Task.findByPk(id);

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Authorization: Only assigned user, creator, project owner, or admin can update
  const project = await Project.findByPk(task.projectId);
  const currentUser = await User.findByPk(userId);

  if (
    task.assignedTo !== userId &&
    task.creatorId !== userId &&
    project.ownerId !== userId &&
    currentUser.role !== 'admin'
  ) {
    throw new AppError('Not authorized to update this task', 403);
  }

  // If assignedTo is being updated, validate the new assignee
  if (taskData.assignedTo && taskData.assignedTo !== task.assignedTo) {
    const newAssignee = await User.findByPk(taskData.assignedTo);
    if (!newAssignee) {
      throw new AppError('New assignee not found', 404);
    }
  }

  Object.assign(task, taskData);
  await task.save();
  cache.del(TASK_CACHE_KEY);
  cache.del(`${TASK_CACHE_KEY}_project_${task.projectId}`);
  cache.del(`${TASK_CACHE_KEY}_${id}`);
  logger.info(`Task updated: ${task.id} by user ${userId}`);
  return task;
};

const deleteTask = async (id, userId) => {
  const task = await Task.findByPk(id);

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Authorization: Only creator, project owner, or admin can delete
  const project = await Project.findByPk(task.projectId);
  const currentUser = await User.findByPk(userId);

  if (
    task.creatorId !== userId &&
    project.ownerId !== userId &&
    currentUser.role !== 'admin'
  ) {
    throw new AppError('Not authorized to delete this task', 403);
  }

  await task.destroy();
  cache.del(TASK_CACHE_KEY);
  cache.del(`${TASK_CACHE_KEY}_project_${task.projectId}`);
  cache.del(`${TASK_CACHE_KEY}_${id}`);
  logger.info(`Task deleted: ${id} by user ${userId}`);
  return { message: 'Task deleted successfully' };
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
```

### `backend/src/utils/appError.js` (Custom Error Class)
```javascript
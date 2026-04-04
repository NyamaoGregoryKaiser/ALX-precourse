```javascript
const taskService = require('../../services/taskService');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../config/logger');

/**
 * Create a new task for the authenticated user.
 */
exports.createTask = catchAsync(async (req, res, next) => {
  const newTask = await taskService.createTask(req.user.id, req.body);
  logger.info(`User ${req.user.id} created task: ${newTask.title}`);

  res.status(201).json({
    status: 'success',
    data: {
      task: newTask,
    },
  });
});

/**
 * Get all tasks for the authenticated user.
 */
exports.getAllTasks = catchAsync(async (req, res, next) => {
  const { tasks, total, results } = await taskService.getAllTasks(req.user.id, req.query);
  logger.debug(`User ${req.user.id} fetched ${results} of ${total} tasks.`);

  res.status(200).json({
    status: 'success',
    results,
    total,
    data: {
      tasks,
    },
  });
});

/**
 * Get a specific task by ID for the authenticated user.
 */
exports.getTaskById = catchAsync(async (req, res, next) => {
  const task = await taskService.getTaskById(req.params.id, req.user.id);
  logger.debug(`User ${req.user.id} fetched task: ${task.id}`);

  res.status(200).json({
    status: 'success',
    data: {
      task,
    },
  });
});

/**
 * Update a task for the authenticated user.
 */
exports.updateTask = catchAsync(async (req, res, next) => {
  const updatedTask = await taskService.updateTask(req.params.id, req.user.id, req.body);
  logger.info(`User ${req.user.id} updated task: ${updatedTask.id}`);

  res.status(200).json({
    status: 'success',
    data: {
      task: updatedTask,
    },
  });
});

/**
 * Delete a task for the authenticated user.
 */
exports.deleteTask = catchAsync(async (req, res, next) => {
  await taskService.deleteTask(req.params.id, req.user.id);
  logger.info(`User ${req.user.id} deleted task: ${req.params.id}`);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
```
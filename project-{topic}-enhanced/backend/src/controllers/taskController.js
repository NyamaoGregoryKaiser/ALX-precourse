```javascript
const taskService = require('../services/taskService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getTasks = catchAsync(async (req, res) => {
  const tasks = await taskService.getTasksByProjectId(req.params.projectId, req.user.id, req.user.role);
  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: { tasks },
  });
});

const getTask = catchAsync(async (req, res, next) => {
  const task = await taskService.getTaskById(req.params.projectId, req.params.id, req.user.id, req.user.role);
  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

const createTask = catchAsync(async (req, res, next) => {
  const { title, description, assignedToId, priority, dueDate } = req.body;
  const task = await taskService.createTask(
    req.params.projectId,
    title,
    description,
    assignedToId,
    priority,
    dueDate,
    req.user.id,
    req.user.role
  );
  res.status(201).json({
    status: 'success',
    data: { task },
  });
});

const updateTask = catchAsync(async (req, res, next) => {
  const updatedTask = await taskService.updateTask(
    req.params.projectId,
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );
  res.status(200).json({
    status: 'success',
    data: { task: updatedTask },
  });
});

const deleteTask = catchAsync(async (req, res, next) => {
  await taskService.deleteTask(req.params.projectId, req.params.id, req.user.id, req.user.role);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
};
```
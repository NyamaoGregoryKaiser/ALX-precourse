const mlTaskService = require('../services/mlTask.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { clearCache } = require('../middleware/cache'); // Import clearCache

exports.getAllMLTasks = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user.id; // From protect middleware

  const mlTasks = await mlTaskService.getAllMLTasks(projectId, userId);

  res.status(200).json({
    status: 'success',
    results: mlTasks.length,
    data: {
      mlTasks,
    },
  });
});

exports.getMLTask = catchAsync(async (req, res, next) => {
  const { projectId, taskId } = req.params;
  const userId = req.user.id;

  const mlTask = await mlTaskService.getMLTaskById(projectId, taskId, userId);

  if (!mlTask) {
    return next(new AppError('ML Task not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      mlTask,
    },
  });
});

exports.createMLTask = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user.id;
  const { type, inputData, parameters } = req.body;

  // Clear relevant cache after a new task is created for a project
  await clearCache(`/api/projects/${projectId}/ml-tasks*`);

  const newMLTask = await mlTaskService.createAndExecuteMLTask(
    projectId,
    userId,
    type,
    inputData,
    parameters
  );

  res.status(201).json({
    status: 'success',
    data: {
      mlTask: newMLTask,
    },
  });
});

exports.deleteMLTask = catchAsync(async (req, res, next) => {
  const { projectId, taskId } = req.params;
  const userId = req.user.id;

  const deleted = await mlTaskService.deleteMLTask(projectId, taskId, userId);

  if (!deleted) {
    return next(new AppError('ML Task not found or you do not have permission to delete it.', 404));
  }

  // Clear relevant cache after a task is deleted
  await clearCache(`/api/projects/${projectId}/ml-tasks*`);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
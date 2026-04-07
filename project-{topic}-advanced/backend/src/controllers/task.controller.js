const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const taskService = require('../services/task.service');
const projectService = require('../services/project.service'); // For project validation

const createTask = catchAsync(async (req, res) => {
  const { projectId } = req; // From nested route middleware
  if (!projectId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Project ID is required.');
  }

  const project = await projectService.getProjectById(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  // Only project creator or admin can create tasks in a project
  if (req.user.role === 'user' && project.createdBy !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to create tasks in this project.');
  }

  const taskBody = { ...req.body, projectId: projectId, createdBy: req.user.id };
  const task = await taskService.createTask(taskBody);
  res.status(httpStatus.CREATED).send(task);
});

const getTasks = catchAsync(async (req, res) => {
  const { projectId } = req; // From nested route middleware
  const filter = pick(req.query, ['title', 'status', 'priority', 'assignedTo']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // If projectId is present, filter tasks by project
  if (projectId) {
    const project = await projectService.getProjectById(projectId);
    if (!project) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
    }
    // Users can only see tasks in projects they have access to (created or admin)
    if (req.user.role === 'user' && project.createdBy !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to view tasks in this project.');
    }
    filter.projectId = projectId;
  } else if (req.user.role === 'user') {
    // If no projectId specified and user is not admin, only show tasks created by or assigned to them
    // This requires more complex query logic, for simplicity we'll show tasks created by user or assigned to user.
    // In a real app, this might involve a JOIN or specific view.
    // For now, let's limit to tasks where user is assignee or creator, but if no projectId, just creator/assignee.
    // This logic is a bit tricky, for simplicity, let's say a user can list all tasks they created or are assigned to, across projects.
    // If projectId is NOT present, we will query all tasks associated with the user
    filter.$or = [
      { createdBy: req.user.id },
      { assignedTo: req.user.id },
    ];
  }

  const result = await taskService.queryTasks(filter, options);
  res.send(result);
});

const getTask = catchAsync(async (req, res) => {
  const { projectId } = req;
  const task = await taskService.getTaskById(req.params.taskId);

  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  // If projectId is present, ensure the task belongs to that project
  if (projectId && task.projectId !== projectId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Task does not belong to the specified project.');
  }

  const project = await projectService.getProjectById(task.projectId);
  if (!project) { // Should not happen if task has a valid projectId
    throw new ApiError(httpStatus.NOT_FOUND, 'Associated project not found for task');
  }

  // Check user access to the project
  if (req.user.role === 'user' && project.createdBy !== req.user.id) {
    // A regular user can only view tasks in projects they created, or tasks directly assigned to them
    if (task.assignedTo !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to view this task.');
    }
  }

  res.send(task);
});

const updateTask = catchAsync(async (req, res) => {
  const { projectId } = req;
  const task = await taskService.getTaskById(req.params.taskId);

  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  if (projectId && task.projectId !== projectId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Task does not belong to the specified project.');
  }

  const project = await projectService.getProjectById(task.projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Associated project not found for task');
  }

  // Only project creator, task creator, task assignee, or admin can update task
  const hasPermission = req.user.role === 'admin' ||
                        project.createdBy === req.user.id ||
                        task.createdBy === req.user.id ||
                        task.assignedTo === req.user.id;

  if (!hasPermission) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to update this task.');
  }

  const updatedTask = await taskService.updateTaskById(req.params.taskId, req.body);
  res.send(updatedTask);
});

const deleteTask = catchAsync(async (req, res) => {
  const { projectId } = req;
  const task = await taskService.getTaskById(req.params.taskId);

  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  if (projectId && task.projectId !== projectId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Task does not belong to the specified project.');
  }

  const project = await projectService.getProjectById(task.projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Associated project not found for task');
  }

  // Only project creator, task creator, or admin can delete task
  const hasPermission = req.user.role === 'admin' ||
                        project.createdBy === req.user.id ||
                        task.createdBy === req.user.id;

  if (!hasPermission) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to delete this task.');
  }

  await taskService.deleteTaskById(req.params.taskId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};
```javascript
const Task = require('../../models/Task');
const Project = require('../../models/Project');
const User = require('../../models/User');
const { CustomError } = require('../../utils/error');
const asyncHandler = require('./asyncHandler');
const logger = require('../../utils/logger');

/**
 * Check if a user is a member (or owner) of a project
 * @param {object} project - Mongoose Project document
 * @param {string} userId - ID of the user to check
 * @returns {boolean}
 */
const isUserProjectMember = (project, userId) => {
  if (!project || !userId) return false;
  return project.owner.equals(userId) || project.members.some(member => member.user.equals(userId));
};

/**
 * @desc    Create a new task within a project
 * @route   POST /api/v1/projects/:projectId/tasks
 * @access  Private/Project Member
 */
exports.createTask = asyncHandler(async (req, res, next) => {
  req.body.projectId = req.params.projectId; // Get project ID from URL params

  const project = await Project.findById(req.body.projectId);
  if (!project) {
    return next(new CustomError(`Project not found with id of ${req.body.projectId}`, 404));
  }

  // Ensure the user creating the task is a member of the project or admin
  if (!isUserProjectMember(project, req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to create tasks in project ${req.body.projectId}`, 403));
  }

  // Ensure the assignedTo user is a member of the project
  const assignedToUser = await User.findById(req.body.assignedTo);
  if (!assignedToUser) {
    return next(new CustomError(`Assigned user not found with id of ${req.body.assignedTo}`, 404));
  }
  if (!isUserProjectMember(project, req.body.assignedTo) && req.user.role !== 'admin') {
    return next(new CustomError(`Assigned user ${req.body.assignedTo} is not a member of project ${req.body.projectId}`, 400));
  }

  const task = await Task.create(req.body);

  logger.info(`Task ${task._id} created by user ${req.user.id} in project ${project._id}`);
  res.status(201).json({
    success: true,
    data: task,
  });
});

/**
 * @desc    Get all tasks for a specific project
 * @route   GET /api/v1/projects/:projectId/tasks
 * @access  Private/Project Member
 */
exports.getTasks = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return next(new CustomError(`Project not found with id of ${req.params.projectId}`, 404));
  }

  // Ensure the user viewing tasks is a member of the project or admin
  if (!isUserProjectMember(project, req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to view tasks in project ${req.params.projectId}`, 403));
  }

  // Basic filtering and sorting
  let query;
  const reqQuery = { ...req.query };

  // Fields to exclude from the query (e.g., pagination, sort)
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);

  let queryStr = JSON.stringify(reqQuery);
  // Create Mongoose operators ($gt, $gte, etc.)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  query = Task.find(JSON.parse(queryStr)).where('projectId').equals(req.params.projectId);

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination (Example: page=1&limit=10)
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Task.countDocuments({ projectId: req.params.projectId });

  query = query.skip(startIndex).limit(limit);

  const tasks = await query.populate('assignedTo', 'username email').populate('projectId', 'name');

  // Pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: tasks.length,
    total: total,
    pagination,
    data: tasks,
  });
});

/**
 * @desc    Get single task by ID
 * @route   GET /api/v1/tasks/:id
 * @access  Private/Project Member
 */
exports.getTaskById = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'username email')
    .populate('projectId', 'name owner members.user'); // Populate project details for authorization

  if (!task) {
    return next(new CustomError(`Task not found with id of ${req.params.id}`, 404));
  }

  // Ensure the user viewing the task is a member of the associated project or admin
  if (!isUserProjectMember(task.projectId, req.user.id) && req.user.role !== 'admin') {
    return next(new CustomError(`User ${req.user.id} is not authorized to view task ${req.params.id}`, 403));
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/v1/tasks/:id
 * @access  Private/Assigned User, Project Owner, Admin
 */
exports.updateTask = asyncHandler(async (req, res, next) => {
  let task = await Task.findById(req.params.id).populate('projectId', 'owner members.user');

  if (!task) {
    return next(new CustomError(`Task not found with id of ${req.params.id}`, 404));
  }

  // Check if user is authorized to update:
  // 1. Task assigned to user
  // 2. Project owner
  // 3. Admin
  const isAssigned = task.assignedTo && task.assignedTo.equals(req.user.id);
  const isProjectOwner = task.projectId && task.projectId.owner.equals(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isAssigned && !isProjectOwner && !isAdmin) {
    return next(new CustomError(`User ${req.user.id} is not authorized to update task ${req.params.id}`, 403));
  }

  // If changing assignedTo, ensure the new assigned user is a project member
  if (req.body.assignedTo && !isUserProjectMember(task.projectId, req.body.assignedTo) && req.user.role !== 'admin') {
    return next(new CustomError(`New assigned user ${req.body.assignedTo} is not a member of project ${task.projectId._id}`, 400));
  }

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'username email')
    .populate('projectId', 'name');

  logger.info(`Task ${task._id} updated by user ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: task,
  });
});

/**
 * @desc    Delete task
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private/Project Owner, Admin
 */
exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('projectId', 'owner');

  if (!task) {
    return next(new CustomError(`Task not found with id of ${req.params.id}`, 404));
  }

  // Check if user is authorized to delete:
  // 1. Project owner
  // 2. Admin
  const isProjectOwner = task.projectId && task.projectId.owner.equals(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isProjectOwner && !isAdmin) {
    return next(new CustomError(`User ${req.user.id} is not authorized to delete task ${req.params.id}`, 403));
  }

  await task.deleteOne();

  logger.info(`Task ${req.params.id} deleted by user ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: {},
    message: 'Task deleted successfully',
  });
});
```
const asyncHandler = require('../middleware/asyncHandler');
const taskService = require('../services/taskService');
const AppError = require('../utils/appError');

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, dueDate, projectId, assignedTo } = req.body;
  const creatorId = req.user.id; // The user creating the task

  if (!title || !projectId) {
    throw new AppError('Task title and projectId are required', 400);
  }

  const task = await taskService.createTask(
    title, description, status, priority, dueDate, projectId, assignedTo, creatorId
  );
  res.status(201).json(task);
});

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const filters = {
    projectId: req.query.projectId,
    assignedTo: req.query.assignedTo,
    status: req.query.status,
    priority: req.query.priority,
    dueDate: req.query.dueDate,
    search: req.query.search,
  };

  // Only allow users to see tasks relevant to them unless admin
  if (req.user.role !== 'admin' && !filters.projectId && !filters.assignedTo) {
    // If not admin and no specific project/assignee filter, default to tasks assigned to current user
    filters.assignedTo = req.user.id;
  } else if (req.user.role !== 'admin' && filters.assignedTo && filters.assignedTo !== req.user.id) {
    // If not admin and trying to filter by another user's assigned tasks
    throw new AppError('Not authorized to view tasks assigned to other users', 403);
  }

  const tasks = await taskService.getTasks(filters);
  res.status(200).json(tasks);
});

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);

  // Authorization: Only assigned user, creator, project owner, or admin can view
  if (task.assignedTo !== req.user.id && task.creatorId !== req.user.id && task.project.ownerId !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to view this task', 403);
  }

  res.status(200).json(task);
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, dueDate, projectId, assignedTo } = req.body;

  const updatedTask = await taskService.updateTask(
    id, { title, description, status, priority, dueDate, projectId, assignedTo }, req.user.id
  );
  res.status(200).json(updatedTask);
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await taskService.deleteTask(id, req.user.id);
  res.status(200).json(result);
});

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
```

### `backend/src/routes/authRoutes.js`
```javascript
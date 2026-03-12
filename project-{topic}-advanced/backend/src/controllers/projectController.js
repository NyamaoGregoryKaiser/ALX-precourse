const asyncHandler = require('../middleware/asyncHandler');
const projectService = require('../services/projectService');
const AppError = require('../utils/appError');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const ownerId = req.user.id; // Get owner from authenticated user

  if (!name) {
    throw new AppError('Project name is required', 400);
  }

  const project = await projectService.createProject(name, description, ownerId);
  res.status(201).json(project);
});

// @desc    Get all projects (or projects owned by user)
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  // Allow filtering projects by owner or get all for admin
  const ownerId = req.query.myProjects === 'true' ? req.user.id : undefined;
  const projects = await projectService.getProjects(ownerId);
  res.status(200).json(projects);
});

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);

  // Authorization: Only owner or admin can view project details, or if tasks are assigned to user
  // This can be further refined based on business rules. For now, let's say only owner/admin.
  if (project.ownerId !== req.user.id && req.user.role !== 'admin') {
    // Optionally, allow if user is assigned to any task within the project
    const isAssignedToTaskInProject = project.tasks.some(task => task.assignedTo === req.user.id);
    if (!isAssignedToTaskInProject) {
      throw new AppError('Not authorized to view this project', 403);
    }
  }

  res.status(200).json(project);
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;

  const updatedProject = await projectService.updateProject(id, { name, description, status }, req.user.id);
  res.status(200).json(updatedProject);
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await projectService.deleteProject(id, req.user.id);
  res.status(200).json(result);
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
```

### `backend/src/controllers/taskController.js` (Task Route Handlers)
```javascript
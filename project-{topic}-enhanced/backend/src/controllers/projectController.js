```javascript
const projectService = require('../services/projectService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const createProject = catchAsync(async (req, res, next) => {
  const { name, description, managerId, memberIds } = req.body;

  // Ensure only ADMIN or MANAGER can create a project
  if (req.user.role === 'MEMBER') {
    return next(new AppError(403, 'Members are not authorized to create projects.'));
  }

  // If user is a MANAGER, they must be the manager of the project they are creating
  if (req.user.role === 'MANAGER' && managerId !== req.user.id) {
    return next(new AppError(403, 'Managers can only create projects where they are assigned as the manager.'));
  }

  const project = await projectService.createProject(name, description, managerId, memberIds, req.user.id);
  res.status(201).json({
    status: 'success',
    data: { project },
  });
});

const getProjects = catchAsync(async (req, res) => {
  const projects = await projectService.getProjects(req.user.id, req.user.role);
  res.status(200).json({
    status: 'success',
    results: projects.length,
    data: { projects },
  });
});

const getProject = catchAsync(async (req, res, next) => {
  const project = await projectService.getProjectById(req.params.id, req.user.id, req.user.role);
  res.status(200).json({
    status: 'success',
    data: { project },
  });
});

const updateProject = catchAsync(async (req, res, next) => {
  const updatedProject = await projectService.updateProject(req.params.id, req.body, req.user.id, req.user.role);
  res.status(200).json({
    status: 'success',
    data: { project: updatedProject },
  });
});

const deleteProject = catchAsync(async (req, res, next) => {
  await projectService.deleteProject(req.params.id, req.user.id, req.user.role);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
```
const projectService = require('../services/project.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { clearCache } = require('../middleware/cache'); // Import clearCache

exports.getAllProjects = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // From protect middleware
  const projects = await projectService.getAllProjects(userId);

  res.status(200).json({
    status: 'success',
    results: projects.length,
    data: {
      projects,
    },
  });
});

exports.getProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const project = await projectService.getProjectById(id, userId);

  if (!project) {
    return next(new AppError('Project not found or you do not have permission to access it.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

exports.createProject = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  const newProject = await projectService.createProject(name, description, userId);

  // Clear cache for all projects for this user after creation
  await clearCache(`/api/projects?userId=${userId}*`);

  res.status(201).json({
    status: 'success',
    data: {
      project: newProject,
    },
  });
});

exports.updateProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id;

  const updatedProject = await projectService.updateProject(id, userId, { name, description });

  if (!updatedProject) {
    return next(new AppError('Project not found or you do not have permission to update it.', 404));
  }

  // Clear cache for specific project and all projects for this user
  await clearCache(`/api/projects/${id}`);
  await clearCache(`/api/projects?userId=${userId}*`);

  res.status(200).json({
    status: 'success',
    data: {
      project: updatedProject,
    },
  });
});

exports.deleteProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const deleted = await projectService.deleteProject(id, userId);

  if (!deleted) {
    return next(new AppError('Project not found or you do not have permission to delete it.', 404));
  }

  // Clear cache for specific project and all projects for this user
  await clearCache(`/api/projects/${id}`);
  await clearCache(`/api/projects?userId=${userId}*`);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
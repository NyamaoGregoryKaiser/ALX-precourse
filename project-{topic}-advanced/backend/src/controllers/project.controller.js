const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const projectService = require('../services/project.service');

const createProject = catchAsync(async (req, res) => {
  // Ensure the project is created by the authenticated user
  const projectBody = { ...req.body, createdBy: req.user.id };
  const project = await projectService.createProject(projectBody);
  res.status(httpStatus.CREATED).send(project);
});

const getProjects = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Users can only see projects they created or are associated with
  if (req.user.role === 'user') {
    filter.createdBy = req.user.id;
  }

  const result = await projectService.queryProjects(filter, options);
  res.send(result);
});

const getProject = catchAsync(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  // Ensure user has access to the project
  if (req.user.role === 'user' && project.createdBy !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access to project forbidden');
  }

  res.send(project);
});

const updateProject = catchAsync(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  // Ensure user has permission to update (only creator or admin)
  if (req.user.role === 'user' && project.createdBy !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to update project');
  }

  const updatedProject = await projectService.updateProjectById(req.params.projectId, req.body);
  res.send(updatedProject);
});

const deleteProject = catchAsync(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  // Ensure user has permission to delete (only creator or admin)
  if (req.user.role === 'user' && project.createdBy !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to delete project');
  }

  await projectService.deleteProjectById(req.params.projectId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
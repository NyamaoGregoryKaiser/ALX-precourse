const projectService = require('../services/project.service');
const logger = require('../utils/logger');
const httpStatus = require('http-status');
const { USER_ROLES } = require('../config/constants');

/**
 * Create a new project
 * POST /api/v1/projects
 */
const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user.id);
    res.status(httpStatus.CREATED).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    logger.error(`Error creating project: ${error.message}`);
    next(error);
  }
};

/**
 * Get all projects
 * GET /api/v1/projects
 */
const getProjects = async (req, res, next) => {
  try {
    let projects;
    // Only show projects owned by the user if not ADMIN/MANAGER,
    // otherwise show all projects.
    if (req.user.role === USER_ROLES.MEMBER) {
      projects = await projectService.getAllProjects(req.user.id);
    } else {
      projects = await projectService.getAllProjects();
    }
    res.status(httpStatus.OK).json(projects);
  } catch (error) {
    logger.error(`Error getting projects: ${error.message}`);
    next(error);
  }
};

/**
 * Get a project by ID
 * GET /api/v1/projects/:id
 */
const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);

    if (!project) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Project not found' });
    }

    // Authorization: Only owner, manager, or admin can view a project
    if (
      project.ownerId !== req.user.id &&
      req.user.role !== USER_ROLES.MANAGER &&
      req.user.role !== USER_ROLES.ADMIN
    ) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to view this project.' });
    }

    res.status(httpStatus.OK).json(project);
  } catch (error) {
    logger.error(`Error getting project ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * Update a project
 * PUT /api/v1/projects/:id
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    // First, check if the project exists and if the user has permissions
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Project not found' });
    }

    // Authorization: Only owner, manager, or admin can update a project
    if (
      existingProject.ownerId !== req.user.id &&
      req.user.role !== USER_ROLES.MANAGER &&
      req.user.role !== USER_ROLES.ADMIN
    ) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to update this project.' });
    }

    const updatedProject = await projectService.updateProject(id, req.body);

    if (!updatedProject) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Project not found after update attempt.' });
    }

    res.status(httpStatus.OK).json({ message: 'Project updated successfully', project: updatedProject });
  } catch (error) {
    logger.error(`Error updating project ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * Delete a project
 * DELETE /api/v1/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    // First, check if the project exists and if the user has permissions
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Project not found' });
    }

    // Authorization: Only owner or admin can delete a project
    if (existingProject.ownerId !== req.user.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to delete this project.' });
    }

    await projectService.deleteProject(id);
    res.status(httpStatus.NO_CONTENT).send(); // 204 No Content for successful deletion
  } catch (error) {
    logger.error(`Error deleting project ${req.params.id}: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
};
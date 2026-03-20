const prisma = require('../../prisma/client');
const logger = require('../utils/logger');
const { getCache, setCache, invalidateCacheByPattern } = require('./cache.service');
const { CACHE_KEYS } = require('../config/constants');

/**
 * Create a new project
 * @param {object} projectData - Project details
 * @param {string} userId - ID of the user creating the project (owner)
 * @returns {Promise<object>} - Created project object
 */
const createProject = async (projectData, userId) => {
  const newProject = await prisma.project.create({
    data: {
      ...projectData,
      ownerId: userId
    }
  });
  await invalidateCacheByPattern(`${CACHE_KEYS.ALL_PROJECTS}*`); // Invalidate all projects cache
  logger.info(`Project created: ${newProject.name} by user ${userId}`);
  return newProject;
};

/**
 * Get all projects, optionally filtered by owner
 * @param {string | undefined} ownerId - Optional owner ID to filter projects
 * @returns {Promise<Array<object>>} - List of projects
 */
const getAllProjects = async (ownerId) => {
  const cacheKey = ownerId ? `${CACHE_KEYS.ALL_PROJECTS}_user_${ownerId}` : CACHE_KEYS.ALL_PROJECTS;
  const cachedProjects = await getCache(cacheKey);
  if (cachedProjects) {
    logger.debug(`Cache hit for projects (owner: ${ownerId || 'all'})`);
    return cachedProjects;
  }

  const whereClause = ownerId ? { ownerId } : {};
  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      owner: {
        select: { id: true, username: true, email: true }
      },
      tasks: {
        select: { id: true, title: true, status: true }
      }
    }
  });

  await setCache(cacheKey, projects, 300); // Cache for 5 minutes
  logger.debug(`Projects (owner: ${ownerId || 'all'}) fetched from DB and cached.`);
  return projects;
};

/**
 * Get a project by ID
 * @param {string} projectId - ID of the project
 * @returns {Promise<object | null>} - Project object or null if not found
 */
const getProjectById = async (projectId) => {
  const cacheKey = CACHE_KEYS.PROJECT_BY_ID(projectId);
  const cachedProject = await getCache(cacheKey);
  if (cachedProject) {
    logger.debug(`Cache hit for project ${projectId}`);
    return cachedProject;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: { id: true, username: true, email: true }
      },
      tasks: {
        include: {
          assignedTo: {
            select: { id: true, username: true }
          }
        }
      }
    }
  });

  if (project) {
    await setCache(cacheKey, project, 300); // Cache for 5 minutes
    logger.debug(`Project ${projectId} fetched from DB and cached.`);
  }
  return project;
};

/**
 * Update a project
 * @param {string} projectId - ID of the project to update
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Updated project object
 */
const updateProject = async (projectId, updateData) => {
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData
  });
  await invalidateCacheByPattern(`${CACHE_KEYS.ALL_PROJECTS}*`); // Invalidate all projects cache
  await invalidateCacheByPattern(CACHE_KEYS.PROJECT_BY_ID(projectId)); // Invalidate specific project cache
  logger.info(`Project ${projectId} updated.`);
  return updatedProject;
};

/**
 * Delete a project
 * @param {string} projectId - ID of the project to delete
 * @returns {Promise<object>} - Deleted project object
 */
const deleteProject = async (projectId) => {
  const deletedProject = await prisma.project.delete({
    where: { id: projectId }
  });
  await invalidateCacheByPattern(`${CACHE_KEYS.ALL_PROJECTS}*`); // Invalidate all projects cache
  await invalidateCacheByPattern(CACHE_KEYS.PROJECT_BY_ID(projectId)); // Invalidate specific project cache
  logger.info(`Project ${projectId} deleted.`);
  return deletedProject;
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject
};
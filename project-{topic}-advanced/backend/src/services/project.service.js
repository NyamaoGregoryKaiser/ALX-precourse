const httpStatus = require('http-status');
const { Project, User } = require('../db/models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger.config');
const { getRedisClient } = require('../config/redis.config');

const PROJECT_CACHE_KEY_PREFIX = 'project:';
const PROJECTS_LIST_CACHE_KEY = 'projects:list';
const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

const invalidateProjectCache = async (projectId) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.del(`${PROJECT_CACHE_KEY_PREFIX}${projectId}`);
    await redisClient.del(PROJECTS_LIST_CACHE_KEY); // Invalidate list cache as well
    logger.debug(`Project cache invalidated for project ID: ${projectId}`);
  } catch (error) {
    logger.error('Error invalidating project cache:', error);
  }
};

const createProject = async (projectBody) => {
  if (await Project.findOne({ where: { name: projectBody.name } })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Project with this name already exists');
  }
  const project = await Project.create(projectBody);
  await invalidateProjectCache(project.id); // Invalidate cache on creation
  return project;
};

const queryProjects = async (filter, options) => {
  const { sortBy, limit, page } = options;
  const offset = (page - 1) * limit;

  // For simplicity, we'll bypass Redis for complex queries with filters/pagination
  // A more advanced caching strategy would involve caching query results based on filter/options.
  const projects = await Project.findAndCountAll({
    where: filter,
    order: sortBy ? [sortBy.split(':')] : [['createdAt', 'DESC']],
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'name', 'email'],
    }],
  });

  return {
    results: projects.rows,
    totalResults: projects.count,
    limit: parseInt(limit, 10) || projects.count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(projects.count / (parseInt(limit, 10) || projects.count)),
  };
};

const getProjectById = async (projectId) => {
  try {
    const redisClient = getRedisClient();
    const cachedProject = await redisClient.get(`${PROJECT_CACHE_KEY_PREFIX}${projectId}`);
    if (cachedProject) {
      logger.debug(`Project ${projectId} retrieved from cache.`);
      return JSON.parse(cachedProject);
    }
  } catch (error) {
    logger.warn(`Failed to retrieve project ${projectId} from cache:`, error.message);
    // Fallback to DB if cache fails
  }

  const project = await Project.findByPk(projectId, {
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'name', 'email'],
    }],
  });

  if (project) {
    try {
      const redisClient = getRedisClient();
      await redisClient.set(`${PROJECT_CACHE_KEY_PREFIX}${projectId}`, JSON.stringify(project), {
        EX: CACHE_EXPIRATION_SECONDS,
      });
      logger.debug(`Project ${projectId} stored in cache.`);
    } catch (error) {
      logger.error(`Failed to store project ${projectId} in cache:`, error);
    }
  } else {
    logger.warn(`Project with ID ${projectId} not found.`);
  }

  return project;
};

const updateProjectById = async (projectId, updateBody) => {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  if (updateBody.name && (await Project.findOne({ where: { name: updateBody.name, id: { [Project.sequelize.Op.ne]: projectId } } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Project with this name already exists');
  }

  Object.assign(project, updateBody);
  await project.save();
  await invalidateProjectCache(projectId); // Invalidate cache on update
  return project;
};

const deleteProjectById = async (projectId) => {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  await project.destroy();
  await invalidateProjectCache(projectId); // Invalidate cache on delete
};

module.exports = {
  createProject,
  queryProjects,
  getProjectById,
  updateProjectById,
  deleteProjectById,
  invalidateProjectCache,
};
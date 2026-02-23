```javascript
const prisma = require('../config/prisma');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const redisClient = require('../config/redis');

const PROJECT_CACHE_KEY_PREFIX = 'projects:';
const PROJECT_LIST_CACHE_KEY = 'projects:list';
const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

const invalidateProjectCache = async (projectId = null) => {
  if (projectId) {
    await redisClient.del(`${PROJECT_CACHE_KEY_PREFIX}${projectId}`);
    logger.debug(`Invalidated project cache for ID: ${projectId}`);
  }
  await redisClient.del(PROJECT_LIST_CACHE_KEY);
  logger.debug('Invalidated project list cache');
};

const createProject = async (name, description, managerId, memberIds = [], userId) => {
  const project = await prisma.project.create({
    data: {
      name,
      description,
      manager: { connect: { id: managerId } },
      members: {
        connect: memberIds.map(id => ({ id })),
      },
      createdBy: { connect: { id: userId } }, // Link to the user who created it
    },
    include: { manager: true, members: true },
  });
  await invalidateProjectCache();
  logger.info(`Project created: ${project.name} by user ${userId}`);
  return project;
};

const getProjects = async (userId, userRole) => {
  let projects;
  const cachedProjects = await redisClient.get(PROJECT_LIST_CACHE_KEY);
  if (cachedProjects) {
    logger.debug('Returning projects from cache');
    return JSON.parse(cachedProjects);
  }

  if (userRole === 'ADMIN') {
    projects = await prisma.project.findMany({
      include: { manager: { select: { id: true, name: true, email: true } }, members: { select: { id: true, name: true, email: true } }, _count: { select: { tasks: true } } },
    });
  } else {
    projects = await prisma.project.findMany({
      where: {
        OR: [
          { managerId: userId },
          {
            members: {
              some: {
                id: userId,
              },
            },
          },
        ],
      },
      include: { manager: { select: { id: true, name: true, email: true } }, members: { select: { id: true, name: true, email: true } }, _count: { select: { tasks: true } } },
    });
  }

  await redisClient.set(PROJECT_LIST_CACHE_KEY, JSON.stringify(projects), { EX: CACHE_EXPIRATION_SECONDS });
  logger.debug('Projects fetched from DB and cached');
  return projects;
};

const getProjectById = async (id, userId, userRole) => {
  const cachedProject = await redisClient.get(`${PROJECT_CACHE_KEY_PREFIX}${id}`);
  if (cachedProject) {
    logger.debug(`Returning project ${id} from cache`);
    return JSON.parse(cachedProject);
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      members: { select: { id: true, name: true, email: true } },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          comments: { select: { id: true } } // Just count comments
        }
      },
    },
  });

  if (!project) {
    throw new AppError(404, 'Project not found.');
  }

  // Authorization check
  const isManagerOrAdmin = userRole === 'ADMIN' || project.managerId === userId;
  const isMember = project.members.some(member => member.id === userId);

  if (!isManagerOrAdmin && !isMember) {
    throw new AppError(403, 'You do not have access to this project.');
  }

  await redisClient.set(`${PROJECT_CACHE_KEY_PREFIX}${id}`, JSON.stringify(project), { EX: CACHE_EXPIRATION_SECONDS });
  logger.debug(`Project ${id} fetched from DB and cached`);
  return project;
};

const updateProject = async (id, updateData, userId, userRole) => {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, managerId: true },
  });

  if (!project) {
    throw new AppError(404, 'Project not found.');
  }

  // Only manager or admin can update a project
  if (project.managerId !== userId && userRole !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to update this project.');
  }

  const { addMemberIds, removeMemberIds, ...dataToUpdate } = updateData;

  const updateOperations = {
    ...dataToUpdate,
  };

  if (addMemberIds && addMemberIds.length > 0) {
    updateOperations.members = {
      connect: addMemberIds.map(memberId => ({ id: memberId })),
    };
  }
  if (removeMemberIds && removeMemberIds.length > 0) {
    updateOperations.members = {
      ...updateOperations.members, // Preserve previous connect if any
      disconnect: removeMemberIds.map(memberId => ({ id: memberId })),
    };
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: updateOperations,
    include: { manager: true, members: true },
  });

  await invalidateProjectCache(id);
  logger.info(`Project updated: ${updatedProject.name} by user ${userId}`);
  return updatedProject;
};

const deleteProject = async (id, userId, userRole) => {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, managerId: true },
  });

  if (!project) {
    throw new AppError(404, 'Project not found.');
  }

  // Only manager or admin can delete a project
  if (project.managerId !== userId && userRole !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to delete this project.');
  }

  await prisma.project.delete({ where: { id } });
  await invalidateProjectCache(id);
  logger.info(`Project deleted: ${id} by user ${userId}`);
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  invalidateProjectCache,
};
```
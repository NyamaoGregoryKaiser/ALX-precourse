const { Project, User, Task } = require('../models');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

const PROJECT_CACHE_KEY = 'all_projects';

const createProject = async (name, description, ownerId) => {
  const project = await Project.create({ name, description, ownerId });
  cache.del(PROJECT_CACHE_KEY); // Invalidate all projects cache
  logger.info(`Project created: ${project.id} by user ${ownerId}`);
  return project;
};

const getProjects = async (ownerId) => {
  const cacheKey = ownerId ? `${PROJECT_CACHE_KEY}_owner_${ownerId}` : PROJECT_CACHE_KEY;
  const cachedProjects = cache.get(cacheKey);
  if (cachedProjects) {
    return cachedProjects;
  }

  const whereClause = ownerId ? { ownerId } : {};
  const projects = await Project.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'username', 'email']
      },
      {
        model: Task,
        as: 'tasks',
        attributes: ['id', 'title', 'status', 'priority', 'dueDate']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  cache.set(cacheKey, projects);
  return projects;
};

const getProjectById = async (id) => {
  const cachedProject = cache.get(`${PROJECT_CACHE_KEY}_${id}`);
  if (cachedProject) {
    return cachedProject;
  }

  const project = await Project.findByPk(id, {
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'username', 'email']
      },
      {
        model: Task,
        as: 'tasks',
        attributes: ['id', 'title', 'status', 'priority', 'dueDate', 'assignedTo'],
        include: [{
          model: User,
          as: 'assignee',
          attributes: ['id', 'username']
        }]
      }
    ],
    order: [[{ model: Task, as: 'tasks' }, 'createdAt', 'ASC']]
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }
  cache.set(`${PROJECT_CACHE_KEY}_${id}`, project);
  return project;
};

const updateProject = async (id, projectData, userId) => {
  const project = await Project.findByPk(id);

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Authorization: Only the owner or an admin can update a project
  if (project.ownerId !== userId && !(await User.findByPk(userId)).role === 'admin') {
    throw new AppError('Not authorized to update this project', 403);
  }

  Object.assign(project, projectData);
  await project.save();
  cache.del(PROJECT_CACHE_KEY);
  cache.del(`${PROJECT_CACHE_KEY}_${id}`);
  logger.info(`Project updated: ${project.id} by user ${userId}`);
  return project;
};

const deleteProject = async (id, userId) => {
  const project = await Project.findByPk(id);

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Authorization: Only the owner or an admin can delete a project
  if (project.ownerId !== userId && !(await User.findByPk(userId)).role === 'admin') {
    throw new AppError('Not authorized to delete this project', 403);
  }

  await project.destroy();
  cache.del(PROJECT_CACHE_KEY);
  cache.del(`${PROJECT_CACHE_KEY}_${id}`);
  logger.info(`Project deleted: ${id} by user ${userId}`);
  return { message: 'Project deleted successfully' };
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
```

### `backend/src/services/taskService.js` (Task Business Logic)
```javascript
const taskService = require('../services/task.service');
const projectService = require('../services/project.service'); // To check project existence and authorization
const logger = require('../utils/logger');
const httpStatus = require('http-status');
const { USER_ROLES } = require('../config/constants');

/**
 * Check if the user has access to the project
 * @param {string} projectId
 * @param {object} user
 * @returns {Promise<boolean>}
 */
const checkProjectAccess = async (projectId, user) => {
  const project = await projectService.getProjectById(projectId);
  if (!project) return false;

  // Admin/Manager always have access
  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MANAGER) return true;

  // Members can access if they are the project owner or assigned to a task within it (though not explicitly checked here,
  // we assume project ownership is the primary gate for project-level access for members).
  // For simplicity, a member can only access projects they own. More complex logic might involve team members.
  return project.ownerId === user.id;
};

/**
 * Create a new task
 * POST /api/v1/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const { projectId, assignedToId } = req.body;

    // Validate project access
    const hasAccess = await checkProjectAccess(projectId, req.user);
    if (!hasAccess) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to create tasks in this project.' });
    }

    // Optional: Validate assignedToId exists if provided
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!assignedUser) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'Assigned user not found.' });
      }
    }

    const task = await taskService.createTask(req.body, req.user.id);
    res.status(httpStatus.CREATED).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    logger.error(`Error creating task: ${error.message}`);
    next(error);
  }
};

/**
 * Get all tasks
 * GET /api/v1/tasks
 * Supports filters: projectId, assignedToId, creatorId, status
 */
const getTasks = async (req, res, next) => {
  try {
    const filters = req.query;

    // If user is a MEMBER, only allow them to see tasks they are assigned to or created,
    // or tasks within projects they own. For simplicity, we limit to assigned/created.
    if (req.user.role === USER_ROLES.MEMBER) {
      // Members can only query tasks related to themselves
      filters.assignedToId = filters.assignedToId || req.user.id;
      filters.creatorId = filters.creatorId || req.user.id;
      // If a projectId filter is present, ensure the member has access to that project.
      // This is a basic check; a more robust solution would involve checking all tasks found against project access.
      if (filters.projectId) {
        const hasAccessToProject = await checkProjectAccess(filters.projectId, req.user);
        if (!hasAccessToProject) {
          return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to view tasks in this project.' });
        }
      }
    }

    const tasks = await taskService.getAllTasks(filters);

    // Filter tasks if a member requested and we fetched broadly due to other filters
    const authorizedTasks = tasks.filter(task => {
        if (req.user.role === USER_ROLES.MEMBER) {
            return task.assignedToId === req.user.id || task.creatorId === req.user.id;
        }
        return true;
    });

    res.status(httpStatus.OK).json(authorizedTasks);
  } catch (error) {
    logger.error(`Error getting tasks: ${error.message}`);
    next(error);
  }
};

/**
 * Get a task by ID
 * GET /api/v1/tasks/:id
 */
const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);

    if (!task) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Task not found' });
    }

    // Authorization: Only assigned user, creator, manager, or admin can view a task
    if (
      task.assignedToId !== req.user.id &&
      task.creatorId !== req.user.id &&
      req.user.role !== USER_ROLES.MANAGER &&
      req.user.role !== USER_ROLES.ADMIN
    ) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to view this task.' });
    }

    res.status(httpStatus.OK).json(task);
  } catch (error) {
    logger.error(`Error getting task ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * Update a task
 * PUT /api/v1/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingTask = await taskService.getTaskById(id);

    if (!existingTask) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Task not found' });
    }

    // Authorization: Only assigned user, creator, manager, or admin can update a task
    // Non-admins cannot change 'creatorId' or 'projectId'
    if (
      existingTask.assignedToId !== req.user.id &&
      existingTask.creatorId !== req.user.id &&
      req.user.role !== USER_ROLES.MANAGER &&
      req.user.role !== USER_ROLES.ADMIN
    ) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to update this task.' });
    }

    // Prevent non-admins/managers from changing creator or project
    if (req.body.creatorId || req.body.projectId) {
      if (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.MANAGER) {
        return res.status(httpStatus.FORBIDDEN).json({ message: 'Only managers or administrators can change task creator or project.' });
      }
    }

    const updatedTask = await taskService.updateTask(id, req.body);
    res.status(httpStatus.OK).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    logger.error(`Error updating task ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * Delete a task
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingTask = await taskService.getTaskById(id);

    if (!existingTask) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Task not found' });
    }

    // Authorization: Only creator, manager, or admin can delete a task
    if (
      existingTask.creatorId !== req.user.id &&
      req.user.role !== USER_ROLES.MANAGER &&
      req.user.role !== USER_ROLES.ADMIN
    ) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to delete this task.' });
    }

    await taskService.deleteTask(id);
    res.status(httpStatus.NO_CONTENT).send(); // 204 No Content for successful deletion
  } catch (error) {
    logger.error(`Error deleting task ${req.params.id}: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask
};
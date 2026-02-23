```javascript
const prisma = require('../config/prisma');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { invalidateProjectCache } = require('./projectService'); // To invalidate project cache when tasks change

const getTasksByProjectId = async (projectId, userId, userRole) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { id: true } } },
  });

  if (!project) {
    throw new AppError(404, 'Project not found.');
  }

  // Authorization check: Only members, manager, or admin can view tasks of a project
  const isManagerOrAdmin = userRole === 'ADMIN' || project.managerId === userId;
  const isMember = project.members.some(member => member.id === userId);

  if (!isManagerOrAdmin && !isMember) {
    throw new AppError(403, 'You do not have access to tasks in this project.');
  }

  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getTaskById = async (projectId, taskId, userId, userRole) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId, projectId },
    include: {
      project: { select: { id: true, managerId: true, members: { select: { id: true } } } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' }
      },
    },
  });

  if (!task) {
    throw new AppError(404, 'Task not found in this project.');
  }

  // Authorization check: Only members, manager, or admin of the project can view a task
  const isManagerOrAdmin = userRole === 'ADMIN' || task.project.managerId === userId;
  const isMember = task.project.members.some(member => member.id === userId);

  if (!isManagerOrAdmin && !isMember) {
    throw new AppError(403, 'You do not have access to this task.');
  }

  return task;
};

const createTask = async (projectId, title, description, assignedToId, priority, dueDate, userId, userRole) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { id: true } } },
  });

  if (!project) {
    throw new AppError(404, 'Project not found.');
  }

  // Only manager or admin can create tasks in a project
  if (project.managerId !== userId && userRole !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to create tasks in this project.');
  }

  // Ensure assignedToId is a member of the project or the manager
  const assignedUserIsMember = project.members.some(member => member.id === assignedToId);
  if (project.managerId !== assignedToId && !assignedUserIsMember) {
    throw new AppError(400, 'Assigned user must be a manager or member of the project.');
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      dueDate,
      project: { connect: { id: projectId } },
      assignedTo: { connect: { id: assignedToId } },
      createdBy: { connect: { id: userId } },
    },
    include: { assignedTo: true },
  });
  await invalidateProjectCache(projectId); // Invalidate project cache as tasks have changed
  logger.info(`Task created: "${task.title}" in project ${projectId} by user ${userId}`);
  return task;
};

const updateTask = async (projectId, taskId, updateData, userId, userRole) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId, projectId },
    include: { project: { select: { id: true, managerId: true, members: { select: { id: true } } } } },
  });

  if (!task) {
    throw new AppError(404, 'Task not found in this project.');
  }

  // Authorization check: Manager/Admin of project OR assigned user for certain fields.
  const isManagerOrAdmin = userRole === 'ADMIN' || task.project.managerId === userId;
  const isAssignedToUser = task.assignedToId === userId;

  // If assignedToId is updated, check if new assignee is a project member/manager
  if (updateData.assignedToId && updateData.assignedToId !== task.assignedToId) {
    if (!isManagerOrAdmin) { // Only manager/admin can reassign tasks
      throw new AppError(403, 'You do not have permission to reassign this task.');
    }
    const newAssignedUserIsMember = task.project.members.some(member => member.id === updateData.assignedToId);
    if (task.project.managerId !== updateData.assignedToId && !newAssignedUserIsMember) {
      throw new AppError(400, 'New assigned user must be a manager or member of the project.');
    }
  }

  // Users can only update their own assigned tasks' status or description if not manager/admin
  if (!isManagerOrAdmin && isAssignedToUser) {
    const allowedFieldsForAssigned = ['status', 'description', 'title']; // Allow assigned user to update status/description
    const unauthorizedFields = Object.keys(updateData).filter(field => !allowedFieldsForAssigned.includes(field));
    if (unauthorizedFields.length > 0) {
      throw new AppError(403, `You do not have permission to update fields: ${unauthorizedFields.join(', ')}`);
    }
  } else if (!isManagerOrAdmin && !isAssignedToUser) {
    // If not manager/admin and not assigned, no permission
    throw new AppError(403, 'You do not have permission to update this task.');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: { assignedTo: true },
  });
  await invalidateProjectCache(projectId); // Invalidate project cache as tasks have changed
  logger.info(`Task updated: "${updatedTask.title}" in project ${projectId} by user ${userId}`);
  return updatedTask;
};

const deleteTask = async (projectId, taskId, userId, userRole) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId, projectId },
    select: { id: true, project: { select: { id: true, managerId: true } } },
  });

  if (!task) {
    throw new AppError(404, 'Task not found in this project.');
  }

  // Only manager or admin can delete tasks
  if (task.project.managerId !== userId && userRole !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to delete this task.');
  }

  await prisma.task.delete({ where: { id: taskId } });
  await invalidateProjectCache(projectId); // Invalidate project cache as tasks have changed
  logger.info(`Task deleted: ${taskId} in project ${projectId} by user ${userId}`);
};

module.exports = {
  getTasksByProjectId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
```
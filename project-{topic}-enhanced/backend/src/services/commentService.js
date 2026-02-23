```javascript
const prisma = require('../config/prisma');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { invalidateProjectCache } = require('./projectService'); // To invalidate project cache

const getCommentsByTaskId = async (taskId, userId, userRole) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, managerId: true, members: { select: { id: true } } } } },
  });

  if (!task) {
    throw new AppError(404, 'Task not found.');
  }

  // Authorization check: Only members, manager, or admin of the project can view comments
  const isManagerOrAdmin = userRole === 'ADMIN' || task.project.managerId === userId;
  const isMember = task.project.members.some(member => member.id === userId);

  if (!isManagerOrAdmin && !isMember) {
    throw new AppError(403, 'You do not have access to view comments for this task.');
  }

  return prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
};

const createComment = async (taskId, content, authorId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, managerId: true, members: { select: { id: true } } } } },
  });

  if (!task) {
    throw new AppError(404, 'Task not found.');
  }

  // Authorization: Only members, manager, or admin of the project can comment
  const isManagerOrAdmin = task.project.managerId === authorId;
  const isMember = task.project.members.some(member => member.id === authorId);

  if (!isManagerOrAdmin && !isMember && authorId !== task.assignedToId) { // Assigned user can also comment
    throw new AppError(403, 'You do not have permission to comment on this task.');
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      task: { connect: { id: taskId } },
      author: { connect: { id: authorId } },
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  await invalidateProjectCache(task.projectId); // Invalidate project cache
  logger.info(`Comment created by user ${authorId} on task ${taskId}`);
  return comment;
};

const updateComment = async (taskId, commentId, content, userId, userRole) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, taskId },
    select: { id: true, authorId: true, taskId: true, task: { select: { projectId: true } } },
  });

  if (!comment) {
    throw new AppError(404, 'Comment not found for this task.');
  }

  // Authorization: Only the author or an admin can update a comment
  if (comment.authorId !== userId && userRole !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to update this comment.');
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  await invalidateProjectCache(comment.task.projectId); // Invalidate project cache
  logger.info(`Comment updated by user ${userId} on task ${taskId}`);
  return updatedComment;
};

const deleteComment = async (taskId, commentId, userId, userRole) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, taskId },
    select: { id: true, authorId: true, taskId: true, task: { select: { projectId: true } } },
  });

  if (!comment) {
    throw new AppError(404, 'Comment not found for this task.');
  }

  // Authorization: Only the author, project manager, or an admin can delete a comment
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { managerId: true } } },
  });

  if (comment.authorId !== userId && task.project.managerId !== userId && userRole !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to delete this comment.');
  }

  await prisma.comment.delete({ where: { id: commentId } });
  await invalidateProjectCache(comment.task.projectId); // Invalidate project cache
  logger.info(`Comment deleted by user ${userId} on task ${taskId}`);
};

module.exports = {
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment,
};
```
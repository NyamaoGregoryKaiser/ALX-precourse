import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

/**
 * Adds a comment to a task.
 * @param {string} taskId - ID of the task the comment belongs to.
 * @param {string} authorId - ID of the user authoring the comment.
 * @param {object} commentData - Data for the new comment (content).
 * @returns {Promise<object>} Created comment object.
 * @throws {AppError} If task or author not found.
 */
const addCommentToTask = async (taskId, authorId, commentData) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  const author = await prisma.user.findUnique({ where: { id: authorId } });
  if (!author) {
    throw new AppError('Author user not found.', 404);
  }

  const newComment = await prisma.comment.create({
    data: {
      content: commentData.content,
      taskId: taskId,
      authorId: authorId,
    },
    include: {
      author: { select: { id: true, username: true, firstName: true } },
    },
  });
  logger.info(`Comment added to task ${taskId} by user ${author.username}`);
  return newComment;
};

/**
 * Retrieves all comments for a specific task.
 * @param {string} taskId - ID of the task.
 * @param {object} queryOptions - Options for filtering, sorting, pagination.
 * @returns {Promise<Array>} List of comments.
 */
const getCommentsByTaskId = async (taskId, queryOptions) => {
  const comments = await prisma.comment.findMany({
    where: { taskId },
    ...queryOptions,
    include: {
      author: { select: { id: true, username: true, email: true } },
    },
  });
  return comments;
};

/**
 * Retrieves a single comment by ID.
 * @param {string} commentId - ID of the comment.
 * @returns {Promise<object>} Comment object.
 * @throws {AppError} If comment not found.
 */
const getCommentById = async (commentId) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: { select: { id: true, username: true, email: true } },
      task: { select: { id: true, title: true, projectId: true } },
    },
  });

  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }
  return comment;
};

/**
 * Updates a comment.
 * @param {string} commentId - ID of the comment to update.
 * @param {string} editorId - ID of the user attempting to update.
 * @param {object} updateData - Data to update (content).
 * @returns {Promise<object>} Updated comment object.
 * @throws {AppError} If comment not found or user not authorized.
 */
const updateComment = async (commentId, editorId, updateData) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }

  // Only the author can update their comment
  if (comment.authorId !== editorId) {
    throw new AppError('You are not authorized to update this comment.', 403);
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: updateData,
    include: {
      author: { select: { id: true, username: true } },
    },
  });
  logger.info(`Comment ${commentId} updated by user ${editorId}`);
  return updatedComment;
};

/**
 * Deletes a comment.
 * @param {string} commentId - ID of the comment to delete.
 * @param {string} deleterId - ID of the user attempting to delete.
 * @param {Role} deleterRole - Role of the user attempting to delete.
 * @returns {Promise<void>}
 * @throws {AppError} If comment not found or user not authorized.
 */
const deleteComment = async (commentId, deleterId, deleterRole) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        include: {
          project: {
            include: {
              team: {
                include: {
                  members: {
                    where: { userId: deleterId }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }

  // Authorization:
  // 1. Comment author can delete
  // 2. Project owner can delete (if task has an owner)
  // 3. Team Manager of the project's team can delete
  // 4. Admin can delete
  const isAuthor = comment.authorId === deleterId;
  const isProjectOwner = comment.task.project.ownerId === deleterId;
  const isTeamManager = comment.task.project.team?.members.some(m => m.userId === deleterId && m.role === 'MANAGER');
  const isAdmin = deleterRole === 'ADMIN';

  if (!isAuthor && !isProjectOwner && !isTeamManager && !isAdmin) {
    throw new AppError('You are not authorized to delete this comment.', 403);
  }

  await prisma.comment.delete({ where: { id: commentId } });
  logger.info(`Comment ${commentId} deleted by user ${deleterId}`);
};


export default {
  addCommentToTask,
  getCommentsByTaskId,
  getCommentById,
  updateComment,
  deleteComment,
};
```

```javascript
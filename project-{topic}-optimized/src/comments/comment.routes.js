import express from 'express';
import commentController from './comment.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { invalidateCache, cacheMiddleware } from '../middleware/cache.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import prisma from '../utils/prisma.js';

const router = express.Router({ mergeParams: true }); // `mergeParams` allows access to taskId from parent route

// Middleware to check if user has access to the task before managing comments
const checkTaskAccess = () => catchAsync(async (req, res, next) => {
  const taskId = req.params.taskId || req.body.taskId;
  if (!taskId) {
    return next(new AppError('Task ID not provided.', 400));
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          team: {
            include: {
              members: {
                where: { userId: req.user.id }
              }
            }
          }
        }
      }
    }
  });

  if (!task) {
    return next(new AppError('Task not found.', 404));
  }

  // Admin always has access
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Project owner, task assignee, or any team member of the project's team can access comments
  const isProjectOwner = task.project.ownerId === req.user.id;
  const isAssignee = task.assigneeId === req.user.id;
  const isTeamMember = task.project.team?.members.length > 0;

  if (isProjectOwner || isAssignee || isTeamMember) {
    return next();
  }

  return next(new AppError('You do not have permission to access comments for this task.', 403));
});


router.use(protect); // All comment routes require authentication

router.route('/')
  .post(
    checkTaskAccess(), // User must have access to the task to add a comment
    invalidateCache(['tasks', 'comments']), // Invalidate task (which includes comments count) and comments cache
    commentController.addComment
  )
  .get(
    checkTaskAccess(), // User must have access to the task to view comments
    cacheMiddleware('comments'),
    commentController.getCommentsForTask
  );

router.route('/:id')
  .get(
    // Access to a specific comment requires access to its parent task
    checkTaskAccess(),
    cacheMiddleware('comments'),
    commentController.getComment
  )
  .patch(
    // Comment author can update, check authorization in service
    checkTaskAccess(),
    invalidateCache(['comments']),
    commentController.updateComment
  )
  .delete(
    // Comment author, project owner, team manager, or admin can delete. Logic in service.
    checkTaskAccess(),
    invalidateCache(['comments']),
    commentController.deleteComment
  );

export default router;
```

```javascript
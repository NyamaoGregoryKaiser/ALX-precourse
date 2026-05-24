import express from 'express';
import taskController from './task.controller.js';
import { protect, restrictTo } from '../auth/auth.middleware.js';
import { Role } from '@prisma/client';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import prisma from '../utils/prisma.js';
import { invalidateCache, cacheMiddleware } from '../middleware/cache.js';

const router = express.Router({ mergeParams: true }); // `mergeParams` allows access to projectId from parent route

// Middleware to check task-specific authorization
const checkTaskAuthorization = (action = 'read') => catchAsync(async (req, res, next) => {
  const taskId = req.params.id;
  const projectId = req.params.projectId; // From nested route /projects/:projectId/tasks
  if (!taskId && !projectId) {
    return next(new AppError('Task or Project ID not provided.', 400));
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

  // Ensure task belongs to the correct project if coming from /projects/:projectId/tasks
  if (projectId && task.projectId !== projectId) {
    return next(new AppError('Task does not belong to the specified project.', 400));
  }

  // Admin always has full access
  if (req.user.role === Role.ADMIN) {
    req.task = task;
    return next();
  }

  // Check project ownership
  const isProjectOwner = task.project.ownerId === req.user.id;

  // Check assignee status
  const isAssignee = task.assigneeId === req.user.id;

  // Check team membership and role
  let isTeamManager = false;
  if (task.project.team && task.project.team.members.length > 0) {
    if (task.project.team.members[0].role === Role.MANAGER) {
      isTeamManager = true;
    }
  }

  // Authorization logic
  if (action === 'read') {
    // Anyone who is project owner, team member (any role), or assignee can read
    if (isProjectOwner || isAssignee || (task.project.team && task.project.team.members.length > 0)) {
      req.task = task;
      return next();
    }
  } else if (action === 'update') {
    // Project owner, team manager, or assignee can update (assignee typically for status/minor details)
    if (isProjectOwner || isTeamManager || isAssignee) {
      // If assignee tries to change more than status, it might require a stricter check
      // For simplicity, any update is allowed for now, but in real app, specific fields might be restricted
      req.task = task;
      return next();
    }
  } else if (action === 'delete') {
    // Only project owner or team manager, or admin can delete
    if (isProjectOwner || isTeamManager) {
      req.task = task;
      return next();
    }
  }

  return next(new AppError('You do not have permission to perform this action on this task.', 403));
});


// All task routes require authentication
router.use(protect);

router
  .route('/')
  .post(
    checkTaskAuthorization('create'), // Inherits from project authorization
    invalidateCache(['tasks', 'projects']),
    taskController.createTask
  )
  .get(
    cacheMiddleware('tasks'),
    taskController.getAllTasks
  );

router
  .route('/:id')
  .get(
    checkTaskAuthorization('read'),
    cacheMiddleware('tasks'),
    taskController.getTask
  )
  .patch(
    checkTaskAuthorization('update'),
    invalidateCache(['tasks', 'projects']),
    taskController.updateTask
  )
  .delete(
    checkTaskAuthorization('delete'),
    invalidateCache(['tasks', 'projects']),
    taskController.deleteTask
  );

export default router;
```

```javascript
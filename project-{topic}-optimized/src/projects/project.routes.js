import express from 'express';
import projectController from './project.controller.js';
import { protect, restrictTo } from '../auth/auth.middleware.js';
import { Role } from '@prisma/client';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import prisma from '../utils/prisma.js';
import { invalidateCache, cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// Middleware to check if the user is the project owner, a team manager (if project has a team), or an admin
const checkProjectAuthorization = (action = 'read') => catchAsync(async (req, res, next) => {
  const projectId = req.params.id;
  if (!projectId) {
    return next(new AppError('Project ID not provided.', 400));
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId: req.user.id }
          }
        }
      }
    }
  });

  if (!project) {
    return next(new AppError('Project not found.', 404));
  }

  // Admin always has access
  if (req.user.role === Role.ADMIN) {
    req.project = project; // Attach project to request for controllers
    return next();
  }

  // Owner always has access
  if (project.ownerId === req.user.id) {
    req.project = project;
    return next();
  }

  // Team members might have access depending on their role and action
  if (project.team && project.team.members.length > 0) {
    const teamMember = project.team.members[0]; // User is a member of this project's team

    if (action === 'read') {
      req.project = project;
      return next(); // Any team member can read
    }

    if (action === 'update' || action === 'delete') {
      // Only team managers can update/delete projects within their team
      if (teamMember.role === Role.MANAGER) {
        req.project = project;
        return next();
      }
    }
  }

  // If none of the above, deny access
  return next(new AppError('You do not have permission to perform this action on this project.', 403));
});


// All project routes require authentication
router.use(protect);

router
  .route('/')
  .post(
    restrictTo(Role.ADMIN, Role.MANAGER, Role.USER), // Anyone can create a project, but roles dictate if it can be assigned to a team
    invalidateCache(['projects']),
    projectController.createProject
  )
  .get(
    cacheMiddleware('projects'),
    projectController.getAllProjects
  );

router
  .route('/:id')
  .get(
    checkProjectAuthorization('read'),
    cacheMiddleware('projects'),
    projectController.getProject
  )
  .patch(
    checkProjectAuthorization('update'),
    invalidateCache(['projects']),
    projectController.updateProject
  )
  .delete(
    checkProjectAuthorization('delete'),
    invalidateCache(['projects']),
    projectController.deleteProject
  );

export default router;
```

```javascript
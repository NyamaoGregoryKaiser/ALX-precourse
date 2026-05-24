import express from 'express';
import teamController from './team.controller.js';
import { protect, restrictTo } from '../auth/auth.middleware.js';
import { Role } from '@prisma/client';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import prisma from '../utils/prisma.js';
import { invalidateCache, cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// Middleware to check if the user is a member of the team or an admin
const checkTeamMembership = (requiredRole = null) => catchAsync(async (req, res, next) => {
  const teamId = req.params.id || req.params.teamId; // Handle both /teams/:id and /teams/:teamId/members
  if (!teamId) {
    return next(new AppError('Team ID not provided.', 400));
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId: req.user.id,
        teamId: teamId,
      },
    },
  });

  if (!teamMember && req.user.role !== Role.ADMIN) {
    return next(new AppError('You are not a member of this team or do not have the required permissions.', 403));
  }

  // If a specific role is required (e.g., MANAGER for updating team details)
  if (requiredRole && teamMember && teamMember.role !== requiredRole && req.user.role !== Role.ADMIN) {
    return next(new AppError(`You must be a ${requiredRole} of this team to perform this action.`, 403));
  }

  // Attach team member role to request for later use
  req.teamMemberRole = teamMember ? teamMember.role : req.user.role; // If admin, consider their role admin
  next();
});

// All team routes require authentication
router.use(protect);

// Admin can create a team and be auto-assigned as manager, or a manager can create.
router
  .route('/')
  .post(
    restrictTo(Role.ADMIN, Role.MANAGER),
    invalidateCache(['teams']),
    teamController.createTeam
  )
  .get(
    // Any authenticated user can view all teams. Could restrict to only teams they are a member of.
    cacheMiddleware('teams'),
    teamController.getAllTeams
  );

router
  .route('/:id')
  .get(
    checkTeamMembership(), // Members can view team details. Admin always can.
    cacheMiddleware('teams'),
    teamController.getTeam
  )
  .patch(
    checkTeamMembership(Role.MANAGER), // Only team managers or admin can update team details
    invalidateCache(['teams']),
    teamController.updateTeam
  )
  .delete(
    restrictTo(Role.ADMIN), // Only admin can delete a team (to prevent accidental deletion by managers)
    invalidateCache(['teams']),
    teamController.deleteTeam
  );

// Team member management routes
router.post('/:id/members',
  checkTeamMembership(Role.MANAGER), // Only managers or admin can add members
  invalidateCache(['teams', 'users']), // Invalidate cache for teams and users
  teamController.addMember
);

router.delete('/:id/members',
  checkTeamMembership(Role.MANAGER), // Only managers or admin can remove members
  invalidateCache(['teams', 'users']),
  teamController.removeMember
);

router.patch('/:id/members/role',
  checkTeamMembership(Role.MANAGER), // Only managers or admin can update member roles
  invalidateCache(['teams', 'users']),
  teamController.updateMemberRole
);


export default router;
```

```javascript
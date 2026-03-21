```typescript
import { Router } from 'express';
import projectController from '@controllers/project.controller';
import { authenticate } from '@middleware/auth.middleware';
import { authorize } from '@middleware/authorize.middleware';
import { UserRole } from '@models/User';
import { validate } from '@middleware/validate.middleware';
import { projectSchema, updateProjectSchema } from '@utils/validationSchemas';
import { cache, clearCache } from '@middleware/cache.middleware';

const router = Router();

router.use(authenticate); // All project routes require authentication

// Create project - users, managers, admins
router.post(
  '/',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]),
  validate(projectSchema),
  projectController.createProject
);

// Get all projects - (Admins can see all, Managers can see all, Users can see their own)
// The service layer handles filtering for users, but middleware can restrict base access.
router.get(
  '/',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]),
  cache('projects'), // Cache project listings
  projectController.getAllProjects
);

// Get project by ID - (Owner, Manager, Admin)
router.get(
  '/:id',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]), // Service layer handles specific project ownership/access
  projectController.getProjectById
);

// Update project - (Owner, Manager, Admin)
router.put(
  '/:id',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]), // Service layer handles specific project ownership/access
  validate(updateProjectSchema),
  projectController.updateProject
);

// Delete project - (Owner, Admin)
router.delete(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]), // Service layer handles specific project ownership/access
  projectController.deleteProject
);

export default router;
```
```typescript
import { Router } from 'express';
import taskController from '@controllers/task.controller';
import { authenticate } from '@middleware/auth.middleware';
import { authorize } from '@middleware/authorize.middleware';
import { UserRole } from '@models/User';
import { validate } from '@middleware/validate.middleware';
import { taskSchema, updateTaskSchema } from '@utils/validationSchemas';

const router = Router();

router.use(authenticate); // All task routes require authentication

// Create task - (Owner of project, Manager, Admin)
router.post(
  '/',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]),
  validate(taskSchema),
  taskController.createTask
);

// Get tasks by project ID - (Owner of project, Assigned user, Manager, Admin)
router.get(
  '/project/:projectId',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]), // Service layer handles specific project/task ownership/access
  taskController.getTasksByProjectId
);

// Get task by ID - (Owner of project, Assigned user, Manager, Admin)
router.get(
  '/:id',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]), // Service layer handles specific project/task ownership/access
  taskController.getTaskById
);

// Update task - (Owner of project, Assigned user, Manager, Admin)
router.put(
  '/:id',
  authorize([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN]), // Service layer handles specific project/task ownership/access
  validate(updateTaskSchema),
  taskController.updateTask
);

// Delete task - (Owner of project, Admin)
router.delete(
  '/:id',
  authorize([UserRole.USER, UserRole.ADMIN]), // Service layer handles specific project ownership/access
  taskController.deleteTask
);

export default router;
```
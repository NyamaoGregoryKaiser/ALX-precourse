import express from 'express';
import { projectController } from '../../controllers/projectController';
import { auth } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { projectValidation } from '../../validation/project.validation';
import { cacheMiddleware } from '../../middleware/cache';
import { taskController } from '../../controllers/taskController';
import { taskValidation } from '../../validation/task.validation';

const router = express.Router();

router.route('/')
  .post(auth, validate(projectValidation.createProject), projectController.createProject)
  .get(auth, cacheMiddleware('projects', 60), projectController.getAllProjects); // Cache by user ID or context

router.route('/:projectId')
  .get(auth, cacheMiddleware('project', 60), projectController.getProject) // Cache by projectId
  .patch(auth, validate(projectValidation.updateProject), projectController.updateProject)
  .delete(auth, projectController.deleteProject);

// Tasks within a project
router.route('/:projectId/tasks')
  .post(auth, validate(taskValidation.createTask), taskController.createTask)
  .get(auth, cacheMiddleware('project-tasks', 30), projectController.getProjectTasks);

export default router;
```

#### `backend/src/routes/v1/task.route.ts`
```typescript
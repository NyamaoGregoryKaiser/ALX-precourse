import express from 'express';
import { taskController } from '../../controllers/taskController';
import { auth } from '../../middleware/auth';
import validate from '../../middleware/validate';
import { taskValidation } from '../../validation/task.validation';
import { cacheMiddleware } from '../../middleware/cache';

const router = express.Router();

router.route('/assigned')
  .get(auth, cacheMiddleware('user-assigned-tasks', 30), taskController.getAssignedTasks); // Cache by user ID and query params

router.route('/:taskId')
  .get(auth, cacheMiddleware('task', 30), taskController.getTask) // Cache by taskId
  .patch(auth, validate(taskValidation.updateTask), taskController.updateTask)
  .delete(auth, taskController.deleteTask);

export default router;
```

#### `backend/src/routes/v1/index.ts`
```typescript
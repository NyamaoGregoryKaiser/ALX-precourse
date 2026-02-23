```javascript
const express = require('express');
const taskController = require('../controllers/taskController');
const { protect, authorize } = require('../middlewares/auth');
const { validate, taskSchemas } = require('../middlewares/validation');
const commentRoutes = require('./commentRoutes'); // Nested routes for comments

// Merge params from parent route (projectRoutes)
const router = express.Router({ mergeParams: true });

// All task routes require authentication (already handled by projectRoutes.use(protect))
// router.use(protect);

router.route('/')
  .get(taskController.getTasks)
  .post(validate(taskSchemas.createTask), authorize(['ADMIN', 'MANAGER']), taskController.createTask);

router.route('/:id')
  .get(validate(taskSchemas.getTaskById), taskController.getTask)
  .patch(validate(taskSchemas.updateTask), taskController.updateTask) // Authorization handled in service based on role/assignment
  .delete(validate(taskSchemas.getTaskById), authorize(['ADMIN', 'MANAGER']), taskController.deleteTask);

// Nested route for comments within a task
router.use('/:taskId/comments', commentRoutes);

module.exports = router;
```
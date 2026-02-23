```javascript
const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const {
  createTaskValidation,
  updateTaskValidation
} = require('../validations/taskValidation');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true }); // mergeParams allows access to :projectId from parent router

// All task routes require authentication
router.use(protect);

router.route('/')
  .post(authorize('admin', 'manager', 'developer'), createTaskValidation, createTask) // Any project member can create tasks
  .get(getTasks); // Any project member can view tasks

router.route('/:id')
  .get(getTaskById) // Any project member can view a task
  .put(authorize('admin', 'manager', 'developer'), updateTaskValidation, updateTask) // Assigned user, project owner, or admin can update
  .delete(authorize('admin', 'manager'), deleteTask); // Project owner or admin can delete

module.exports = router;
```
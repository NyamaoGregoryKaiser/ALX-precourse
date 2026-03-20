const express = require('express');
const taskController = require('../controllers/task.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { USER_ROLES } = require('../config/constants');
const { validate, taskSchema, updateTaskSchema } = require('../utils/validation');

const router = express.Router();

router.use(authenticate); // All task routes require authentication

router.post(
  '/',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]),
  validate(taskSchema),
  taskController.createTask
);
router.get(
  '/',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]),
  taskController.getTasks
);
router.get(
  '/:id',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]),
  taskController.getTask
);
router.put(
  '/:id',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]),
  validate(updateTaskSchema),
  taskController.updateTask
);
router.delete(
  '/:id',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]),
  taskController.deleteTask
);

module.exports = router;
const express = require('express');
const taskController = require('../controllers/task.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const taskValidation = require('../validators/task.validator');

const router = express.Router({ mergeParams: true }); // Enable mergeParams to access projectId from parent route

router
  .route('/')
  .post(auth('admin', 'user'), validate(taskValidation.createTask), taskController.createTask)
  .get(auth('admin', 'user'), validate(taskValidation.getTasks), taskController.getTasks);

router
  .route('/:taskId')
  .get(auth('admin', 'user'), validate(taskValidation.getTask), taskController.getTask)
  .patch(auth('admin', 'user'), validate(taskValidation.updateTask), taskController.updateTask)
  .delete(auth('admin', 'user'), validate(taskValidation.deleteTask), taskController.deleteTask);

module.exports = router;
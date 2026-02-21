const express = require('express');
const mlTaskController = require('../controllers/mlTask.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createMLTaskSchema } = require('../utils/validation/mlTask.validation');

const router = express.Router({ mergeParams: true }); // Allows access to projectId from parent route

router.use(protect); // All ML task routes are protected

router
  .route('/')
  .get(mlTaskController.getAllMLTasks)
  .post(validate(createMLTaskSchema), mlTaskController.createMLTask);

router
  .route('/:taskId')
  .get(mlTaskController.getMLTask)
  .delete(mlTaskController.deleteMLTask);

module.exports = router;
const express = require('express');
const projectController = require('../controllers/project.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../utils/validation/project.validation');
const mlTaskRoutes = require('./mlTask.routes');

const router = express.Router();

router.use(protect); // All project routes are protected

// Nested routes for ML tasks
router.use('/:projectId/ml-tasks', mlTaskRoutes);

router
  .route('/')
  .get(projectController.getAllProjects)
  .post(validate(createProjectSchema), projectController.createProject);

router
  .route('/:id')
  .get(projectController.getProject)
  .put(validate(updateProjectSchema), projectController.updateProject)
  .delete(projectController.deleteProject);

module.exports = router;
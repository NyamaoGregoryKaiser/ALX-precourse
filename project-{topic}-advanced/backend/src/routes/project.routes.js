const express = require('express');
const projectController = require('../controllers/project.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const projectValidation = require('../validators/project.validator');
const taskRoutes = require('./task.routes'); // Nested routes

const router = express.Router();

router
  .route('/')
  .post(auth('admin', 'user'), validate(projectValidation.createProject), projectController.createProject)
  .get(auth('admin', 'user'), validate(projectValidation.getProjects), projectController.getProjects);

router
  .route('/:projectId')
  .get(auth('admin', 'user'), validate(projectValidation.getProject), projectController.getProject)
  .patch(auth('admin', 'user'), validate(projectValidation.updateProject), projectController.updateProject)
  .delete(auth('admin', 'user'), validate(projectValidation.deleteProject), projectController.deleteProject);

// Nested routes for tasks within a project
router.use('/:projectId/tasks', (req, res, next) => {
  req.projectId = req.params.projectId; // Pass projectId to nested task routes
  next();
}, taskRoutes);

module.exports = router;
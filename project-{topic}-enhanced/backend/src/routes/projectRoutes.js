```javascript
const express = require('express');
const projectController = require('../controllers/projectController');
const { protect, authorize } = require('../middlewares/auth');
const { validate, projectSchemas } = require('../middlewares/validation');
const taskRoutes = require('./taskRoutes'); // Nested routes for tasks

const router = express.Router();

router.use(protect); // All project routes require authentication

router.route('/')
  .post(validate(projectSchemas.createProject), authorize(['ADMIN', 'MANAGER']), projectController.createProject)
  .get(projectController.getProjects); // Members can view their own projects

router.route('/:id')
  .get(validate(projectSchemas.getProjectById), projectController.getProject)
  .patch(validate(projectSchemas.updateProject), authorize(['ADMIN', 'MANAGER']), projectController.updateProject)
  .delete(validate(projectSchemas.getProjectById), authorize(['ADMIN', 'MANAGER']), projectController.deleteProject);

// Nested route for tasks within a project
router.use('/:projectId/tasks', taskRoutes);

module.exports = router;
```
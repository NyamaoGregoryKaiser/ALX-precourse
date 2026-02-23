```javascript
const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember
} = require('../controllers/projectController');
const {
  createProjectValidation,
  updateProjectValidation,
  addMemberValidation
} = require('../validations/projectValidation');
const { protect, authorize } = require('../../middleware/auth');

// Include task router for nested routes
const taskRouter = require('./taskRoutes');

const router = express.Router();

// All project routes require authentication
router.use(protect);

// Re-route into task router for tasks associated with a project
// Example: GET /api/v1/projects/:projectId/tasks will go to taskRouter
router.use('/:projectId/tasks', taskRouter);

router.route('/')
  .post(authorize('admin', 'manager'), createProjectValidation, createProject)
  .get(getProjects); // Any authenticated user can get projects they are a member of

router.route('/:id')
  .get(getProjectById) // Check project membership inside controller
  .put(authorize('admin', 'manager'), updateProjectValidation, updateProject) // Project owner or admin can update
  .delete(authorize('admin', 'manager'), deleteProject); // Project owner or admin can delete

router.route('/:id/members')
  .post(authorize('admin', 'manager'), addMemberValidation, addProjectMember); // Project owner or admin can add members

router.route('/:projectId/members/:memberId')
  .delete(authorize('admin', 'manager'), removeProjectMember); // Project owner or admin can remove members

module.exports = router;
```
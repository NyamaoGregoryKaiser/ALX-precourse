const express = require('express');
const projectController = require('../controllers/project.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { USER_ROLES } = require('../config/constants');
const { validate, projectSchema } = require('../utils/validation');

const router = express.Router();

router.use(authenticate); // All project routes require authentication

router.post(
  '/',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]), // Any role can create a project
  validate(projectSchema),
  projectController.createProject
);
router.get(
  '/',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]), // Any role can view projects (with filtering)
  projectController.getProjects
);
router.get(
  '/:id',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]), // Any role can view a specific project (with ownership check)
  projectController.getProject
);
router.put(
  '/:id',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]), // Any role can update a specific project (with ownership/manager check)
  validate(projectSchema.min(1)), // Ensure at least one field is provided for update
  projectController.updateProject
);
router.delete(
  '/:id',
  authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.MEMBER]), // Any role can delete a specific project (with ownership/admin check)
  projectController.deleteProject
);

module.exports = router;
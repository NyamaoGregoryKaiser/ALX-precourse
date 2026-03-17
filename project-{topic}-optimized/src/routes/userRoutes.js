const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Routes for individual user management
router.get('/:id', authenticate, userController.getUser);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, userController.deleteUser); // Consider soft-delete in production

// Admin-only routes
router.get('/', authenticate, authorize(USER_ROLES.ADMIN), userController.getAllUsers);

module.exports = router;
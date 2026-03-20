const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { USER_ROLES } = require('../config/constants');
const { validate, userUpdateSchema } = require('../utils/validation');

const router = express.Router();

// Routes requiring authentication for all users
router.use(authenticate);

router.get('/me', userController.getMe);
router.get('/', authorize([USER_ROLES.ADMIN, USER_ROLES.MANAGER]), userController.getUsers); // Admin/Manager can view all users
router.get('/:id', userController.getUser); // Any authenticated user can view another user's public profile
router.put('/:id', validate(userUpdateSchema), userController.updateUser); // User can update self, Admin can update others
router.delete('/:id', authorize([USER_ROLES.ADMIN]), userController.deleteUser); // Only Admin can delete users

module.exports = router;
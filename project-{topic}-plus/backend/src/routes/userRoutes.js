```javascript
const express = require('express');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validatorMiddleware');
const { createUserSchema, updateUserSchema, userIdSchema } = require('../validators/userValidator');

const router = express.Router();

// Admin-only routes for user management
router.route('/')
  .get(protect, authorize('admin'), userController.getAllUsers) // Get all users
  .post(protect, authorize('admin'), validate({ body: createUserSchema }), userController.createUser); // Create user

router.route('/:id')
  .get(protect, validate({ params: userIdSchema }), userController.getUserById) // Get specific user (admin or owner)
  .put(protect, validate({ params: userIdSchema, body: updateUserSchema }), userController.updateUser) // Update specific user (admin or owner)
  .delete(protect, authorize('admin'), validate({ params: userIdSchema }), userController.deleteUser); // Delete specific user (admin only)

router.post(
  '/:id/restore',
  protect,
  authorize('admin'),
  validate({ params: userIdSchema }),
  userController.restoreUser
);

module.exports = router;
```
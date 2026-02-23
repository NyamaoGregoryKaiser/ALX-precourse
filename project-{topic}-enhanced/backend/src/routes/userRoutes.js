```javascript
const express = require('express');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const { validate, userSchemas } = require('../middlewares/validation');

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Admin-only routes for managing all users
router.route('/')
  .get(authorize(['ADMIN']), userController.getAllUsers); // Only admin can get all users

// Specific user routes
router.route('/:id')
  .get(validate(userSchemas.updateUser), authorize(['ADMIN', 'MANAGER', 'MEMBER']), userController.getUser) // User can get their own profile, admin/manager can get others
  .patch(validate(userSchemas.updateUser), authorize(['ADMIN', 'MANAGER', 'MEMBER']), userController.updateUser) // User can update self, admin can update anyone. Manager can update members.
  .delete(validate(userSchemas.updateUser), authorize(['ADMIN']), userController.deleteUser); // Only admin can delete users

module.exports = router;
```
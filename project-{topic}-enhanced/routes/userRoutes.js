```javascript
const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeMiddleware = require('../middleware/authorizeMiddleware');

const router = express.Router();

// All user management routes require authentication
router.use(authMiddleware.authenticate);

// Admin specific routes
router.route('/')
  .get(authorizeMiddleware.authorize('admin'), userController.getAllUsers) // Only admins can view all users
  .post(authorizeMiddleware.authorize('admin'), userController.createUser); // Only admins can create users (beyond self-registration)

router.route('/:id')
  .get(authorizeMiddleware.authorize('admin'), userController.getUserById) // Only admins can view any user by ID
  .put(authorizeMiddleware.authorize('admin'), userController.updateUser) // Only admins can update any user
  .delete(authorizeMiddleware.authorize('admin'), userController.deleteUser); // Only admins can delete any user

// Note: A user should be able to update their OWN profile,
// but that logic would typically be in a separate route like /auth/profile,
// or require additional middleware to check if req.user.id === req.params.id
// For this example, /users/:id is restricted to admin.

module.exports = router;
```
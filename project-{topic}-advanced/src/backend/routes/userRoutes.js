```javascript
const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../utils/validationSchemas');
const { updateUserSchema } = require('../utils/validationSchemas');

const router = express.Router();

// Routes protected by authentication
router.use(authMiddleware.protect);

// Admin-only routes for general user management
router.get('/', authMiddleware.authorize('admin'), userController.getAllUsers);
router.get('/:id', authMiddleware.authorize('admin'), userController.getUserById);

// User can update their own profile, admin can update any user's profile
router.patch('/:id', validate(updateUserSchema), userController.updateUser);

// Admin-only route for deleting users
router.delete('/:id', authMiddleware.authorize('admin'), userController.deleteUser);


module.exports = router;
```
```javascript
const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, Schemas } = require('../utils/validator');

const router = express.Router();

router.use(protect); // All user routes require authentication

// Get authenticated user's profile
router.get('/me', userController.getMe);
router.patch('/me', validate(Schemas.updateUser), userController.updateMe);
router.delete('/me', userController.deleteMe);

// Admin-only routes for user management
router.use(restrictTo('admin'));
router.route('/')
  .get(userController.getAllUsers);

router.route('/:id')
  .get(userController.getUserById)
  .patch(validate(Schemas.updateUser), userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
```
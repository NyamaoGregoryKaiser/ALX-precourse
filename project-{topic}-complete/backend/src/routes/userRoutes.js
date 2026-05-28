```javascript
const express = require('express');
const UserController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected user routes (require authentication)
router.route('/profile')
    .get(protect, UserController.getMyProfile)
    .put(protect, UserController.updateMyProfile);

router.patch('/change-password', protect, UserController.changeMyPassword);

// Admin routes (require admin authorization)
router.route('/')
    .get(protect, authorize('admin'), UserController.getAllUsers); // This assumes a getAllUsers service method
router.route('/:id')
    .delete(protect, authorize('admin'), UserController.deleteUser);

module.exports = router;
```
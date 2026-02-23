```javascript
const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../../middleware/auth');
const { userUpdateValidation } = require('../validations/userValidation'); // Assuming a user update validation

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Only admin/manager can view all users or specific users
router.route('/')
  .get(authorize('admin', 'manager'), getAllUsers);

router.route('/:id')
  .get(authorize('admin', 'manager'), getUserById)
  .put(authorize('admin', 'manager'), userUpdateValidation, updateUser) // Admin/Manager can update any user
  .delete(authorize('admin'), deleteUser); // Only admin can delete users

module.exports = router;
```
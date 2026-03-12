const express = require('express');
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Admin-specific routes
router.route('/').get(authorize('admin'), getUsers); // Only admin can get all users

// User-specific or admin routes
router.route('/:id')
  .get(getUserById) // User can get their own profile, admin can get any
  .put(updateUser)  // User can update their own profile, admin can update any
  .delete(authorize('admin'), deleteUser); // Only admin can delete users

module.exports = router;
```

### `backend/src/routes/projectRoutes.js`
```javascript
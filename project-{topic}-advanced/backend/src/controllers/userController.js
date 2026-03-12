const asyncHandler = require('../middleware/asyncHandler');
const userService = require('../services/userService');
const { authorize } = require('../middleware/authMiddleware');
const AppError = require('../utils/appError');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  // Authorization check is handled by middleware but good to double check
  if (req.user.role !== 'admin') {
    throw new AppError('Not authorized to access user list', 403);
  }
  const users = await userService.getUsers();
  res.status(200).json(users);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin or User itself
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  // Allow user to view their own profile or admin to view any profile
  if (user.id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to view this user profile', 403);
  }

  res.status(200).json(user);
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or User itself
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body; // Prevent password update via this route

  // Check authorization: User can update their own profile, admin can update any
  if (id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this user', 403);
  }

  // Prevent regular users from changing their role
  if (role && req.user.role !== 'admin') {
    throw new AppError('Not authorized to change user role', 403);
  }

  const updatedUser = await userService.updateUser(id, { username, email, role });
  res.status(200).json(updatedUser);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Only admin can delete users
  if (req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete users', 403);
  }

  if (id === req.user.id) {
    throw new AppError('Cannot delete your own account via this route', 400);
  }

  const result = await userService.deleteUser(id);
  res.status(200).json(result);
});

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
```

### `backend/src/controllers/projectController.js` (Project Route Handlers)
```javascript
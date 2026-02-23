```javascript
const User = require('../../models/User');
const { CustomError } = require('../../utils/error');
const asyncHandler = require('./asyncHandler');
const logger = require('../../utils/logger');

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private/Admin, Manager
 */
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find().select('-password'); // Exclude passwords

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin, Manager
 */
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new CustomError(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user (Admin/Manager can update any user, user can update self)
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin, Manager
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { username, email, role } = req.body;

  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError(`User not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is authorized to update.
  // An admin can update any user. A manager can update any user.
  // A regular user can only update their own profile (handled by a different route typically, but for this, admin/manager only)
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return next(new CustomError(`User ${req.user.id} is not authorized to update user ${req.params.id}`, 403));
  }

  const updatedFields = { username, email, role };

  user = await User.findByIdAndUpdate(req.params.id, updatedFields, {
    new: true,
    runValidators: true,
  }).select('-password');

  logger.info(`User ${user._id} updated by ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError(`User not found with id of ${req.params.id}`, 404));
  }

  // Admins cannot delete other admins or themselves if they are the only admin (business logic decision)
  // For simplicity, here we just allow admin to delete any user.
  await user.deleteOne();

  logger.info(`User ${req.params.id} deleted by ${req.user.id}`);
  res.status(200).json({
    success: true,
    data: {},
    message: 'User deleted successfully',
  });
});
```
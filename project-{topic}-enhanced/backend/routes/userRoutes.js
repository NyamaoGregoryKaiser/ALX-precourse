```javascript
const express = require('express');
const { protect, authorize, asyncHandler } = require('../middleware/auth');
const User = require('../models/user');
const ApiError = require('../utils/ApiError');
const { clearCache } = require('../middleware/cache');

const router = express.Router();

// Helper to fetch user data and exclude password
const getUserData = async (req, res, next) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] }
  });
  if (!user) {
    return next(new ApiError(404, `User with id ${req.params.id} not found`));
  }
  req.targetUser = user;
  next();
};

// Only Admin can manage all users
router.use(protect); // All routes below are protected

router
  .route('/')
  .get(authorize('admin'), asyncHandler(async (req, res) => {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.status(200).json({ success: true, count: users.length, data: users });
  }))
  .post(authorize('admin'), asyncHandler(async (req, res, next) => {
    // Basic user creation, password hashing handled by model hook
    const user = await User.create(req.body);
    await clearCache('users:*');
    res.status(201).json({ success: true, data: user });
  }));

router
  .route('/:id')
  .get(authorize('admin', 'editor'), getUserData, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: req.targetUser });
  }))
  .put(authorize('admin'), getUserData, asyncHandler(async (req, res, next) => {
    // Prevent updating role to admin by non-admins or self demotion if not admin
    if (req.body.role && req.body.role === 'admin' && req.user.role !== 'admin') {
      return next(new ApiError(403, 'Only admins can assign or update user roles to admin.'));
    }
    await req.targetUser.update(req.body);
    await clearCache('users:*');
    res.status(200).json({ success: true, data: req.targetUser });
  }))
  .delete(authorize('admin'), getUserData, asyncHandler(async (req, res, next) => {
    if (req.targetUser.id === req.user.id) {
      return next(new ApiError(400, 'Cannot delete your own account via this endpoint. Use profile settings.'));
    }
    await req.targetUser.destroy();
    await clearCache('users:*');
    res.status(200).json({ success: true, data: {} });
  }));

module.exports = router;
```
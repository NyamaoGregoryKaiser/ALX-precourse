```javascript
import express from 'express';
import httpStatus from 'http-status';
import userService from '../services/userService.js';
import auth from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * @route GET /api/users
 * @description Get all users
 * @access Private (Admin/Auth required, simplified to Auth for this project)
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(httpStatus.OK).send(users);
  } catch (error) {
    logger.error('Error fetching all users:', error.message);
    next(error);
  }
});

/**
 * @route GET /api/users/:userId
 * @description Get a user by ID
 * @access Private (Auth required, user can view their own profile or others in future)
 */
router.get('/:userId', auth, async (req, res, next) => {
  try {
    // For simplicity, allow user to fetch their own ID. Can be extended for admin roles.
    if (req.params.userId !== req.user.id) {
        // If an admin role was implemented, it would bypass this check.
        // For now, only a user themselves can fetch their detailed profile.
        // Or, allow fetching public profiles for all users. Here, we'll enforce self-access.
        // Let's modify: allow fetching any user's public profile, but return only public data.
        const user = await userService.getUserById(req.params.userId);
        return res.status(httpStatus.OK).send({
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
        });
    }
    const user = await userService.getUserById(req.params.userId);
    res.status(httpStatus.OK).send(user);
  } catch (error) {
    logger.error(`Error fetching user ${req.params.userId}:`, error.message);
    next(error);
  }
});

/**
 * @route PUT /api/users/:userId
 * @description Update user details
 * @access Private (Only user can update their own profile)
 */
router.put('/:userId', auth, async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own profile');
    }
    const updatedUser = await userService.updateUserById(req.params.userId, req.body);
    res.status(httpStatus.OK).send(updatedUser);
  } catch (error) {
    logger.error(`Error updating user ${req.params.userId}:`, error.message);
    next(error);
  }
});

/**
 * @route DELETE /api/users/:userId
 * @description Delete a user
 * @access Private (Only user can delete their own profile)
 */
router.delete('/:userId', auth, async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own profile');
    }
    await userService.deleteUserById(req.params.userId);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    logger.error(`Error deleting user ${req.params.userId}:`, error.message);
    next(error);
  }
});

export default router;
```
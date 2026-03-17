const userService = require('../services/userService');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Retrieves a user by ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ user });
  } catch (error) {
    logger.error(`Error in userController.getUser for ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Retrieves all users (admin only).
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ users });
  } catch (error) {
    logger.error('Error in userController.getAllUsers:', error);
    next(error);
  }
};

/**
 * Updates a user's profile.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const updateUser = async (req, res, next) => {
  try {
    // Users can only update their own profile, unless they are an admin.
    // An admin can update any user's profile.
    const userIdToUpdate = req.params.id;
    const { id: authenticatedUserId, role: authenticatedUserRole } = req.user;

    if (authenticatedUserRole !== 'admin' && authenticatedUserId !== userIdToUpdate) {
      return next(new ApiError(403, 'Forbidden: You can only update your own profile.'));
    }

    const updatedUser = await userService.updateUser(userIdToUpdate, req.body);
    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Error in userController.updateUser for ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Deletes a user.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const deleteUser = async (req, res, next) => {
  try {
    const userIdToDelete = req.params.id;
    const { id: authenticatedUserId, role: authenticatedUserRole } = req.user;

    // Only admins can delete other users, or a user can delete their own account.
    if (authenticatedUserRole !== 'admin' && authenticatedUserId !== userIdToDelete) {
      return next(new ApiError(403, 'Forbidden: You can only delete your own account.'));
    }

    const message = await userService.deleteUser(userIdToDelete);
    res.status(200).json({ message });
  } catch (error) {
    logger.error(`Error in userController.deleteUser for ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getUser,
  getAllUsers,
  updateUser,
  deleteUser,
};
const userService = require('../services/user.service');
const logger = require('../utils/logger');
const httpStatus = require('http-status');

/**
 * Get current authenticated user's profile
 * GET /api/v1/users/me
 */
const getMe = async (req, res, next) => {
  try {
    // req.user.details is populated by auth.middleware.js
    if (!req.user || !req.user.details) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: 'User not authenticated.' });
    }

    // You can fetch a fresh user object if req.user.details isn't enough or potentially stale
    const user = await userService.getUserById(req.user.details.id);
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found.' });
    }

    res.status(httpStatus.OK).json(user);
  } catch (error) {
    logger.error(`Error getting current user profile: ${error.message}`);
    next(error);
  }
};

/**
 * Get a user by ID
 * GET /api/v1/users/:id
 */
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
    }

    res.status(httpStatus.OK).json(user);
  } catch (error) {
    logger.error(`Error getting user ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * Get all users
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(httpStatus.OK).json(users);
  } catch (error) {
    logger.error(`Error getting all users: ${error.message}`);
    next(error);
  }
};

/**
 * Update a user (Admin/Self)
 * PUT /api/v1/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role: requesterRole, id: requesterId } = req.user;

    // Authorization check: Only admin can update others or change roles
    if (requesterRole !== 'ADMIN' && requesterId !== id) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'You do not have permission to update this user.' });
    }

    // Prevent non-admins from changing roles
    if (req.body.role && requesterRole !== 'ADMIN') {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'Only administrators can change user roles.' });
    }

    const updatedUser = await userService.updateUser(id, req.body);

    if (!updatedUser) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
    }

    res.status(httpStatus.OK).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}: ${error.message}`);
    next(error);
  }
};

/**
 * Delete a user (Admin only)
 * DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role: requesterRole } = req.user;

    // Authorization check: Only admin can delete users
    if (requesterRole !== 'ADMIN') {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'Only administrators can delete users.' });
    }

    const deletedUser = await userService.deleteUser(id);

    if (!deletedUser) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
    }

    res.status(httpStatus.NO_CONTENT).send(); // 204 No Content for successful deletion
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getMe,
  getUser,
  getUsers,
  updateUser,
  deleteUser
};
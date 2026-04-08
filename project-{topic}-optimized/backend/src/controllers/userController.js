const userService = require('../services/userService');
const { NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');

exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { users, total } = await userService.getAllUsers(parseInt(page, 10), parseInt(limit, 10));
    logger.debug(`Admin user ${req.user.id} retrieved ${users.length} users`);
    res.status(200).json({
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    logger.error(`Error retrieving all users by admin ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    logger.debug(`Admin user ${req.user.id} retrieved user ${id}`);
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    logger.error(`Error retrieving user ${req.params.id} by admin ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUserData = req.body;
    // Only an admin can update other users, and only an admin can change roles
    // The `authorizeRoles('admin')` middleware ensures only admin can reach this.
    // However, if an admin tries to update their own role, extra logic might be needed
    // to prevent accidental lockout, but for now, any admin can update any user (including self).

    const updatedUser = await userService.updateUser(id, updatedUserData);
    if (!updatedUser) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    logger.info(`Admin user ${req.user.id} updated user ${id}`);
    res.status(200).json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id} by admin ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(id, 10)) {
      throw new APIError('Admin cannot delete their own account via this endpoint.', 403);
    }
    const deleted = await userService.deleteUser(id);
    if (!deleted) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    logger.info(`Admin user ${req.user.id} deleted user ${id}`);
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id} by admin ${req.user.id}: ${error.message}`, { error });
    next(error);
  }
};
```
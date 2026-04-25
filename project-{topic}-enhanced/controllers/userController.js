```javascript
const Joi = require('joi');
const userService = require('../services/userService');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const userIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('user', 'admin').optional(),
  password: Joi.string().min(8).optional(), // Allow password change, but handle hashing in service
}).min(1); // At least one field must be present for update

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.findAllUsers();
    logger.info('Fetched all users.');
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users: users.map(user => ({ id: user.id, username: user.username, email: user.email, role: user.role })),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { error } = userIdSchema.validate(req.params);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const user = await userService.findUserById(req.params.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    logger.info(`Fetched user with ID: ${req.params.id}`);
    res.status(200).json({
      status: 'success',
      data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const user = await userService.createUser(value);
    logger.info(`Created new user with ID: ${user.id}`);
    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { error: idError } = userIdSchema.validate(req.params);
    if (idError) {
      throw new AppError(idError.details[0].message, 400);
    }

    const { error: bodyError, value } = updateUserSchema.validate(req.body);
    if (bodyError) {
      throw new AppError(bodyError.details[0].message, 400);
    }

    const updatedUser = await userService.updateUser(req.params.id, value);
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }
    logger.info(`Updated user with ID: ${req.params.id}`);
    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, role: updatedUser.role } },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { error } = userIdSchema.validate(req.params);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const deleted = await userService.deleteUser(req.params.id);
    if (!deleted) {
      throw new AppError('User not found', 404);
    }
    logger.info(`Deleted user with ID: ${req.params.id}`);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
```
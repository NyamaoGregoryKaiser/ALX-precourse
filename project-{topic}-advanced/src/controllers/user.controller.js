```javascript
const httpStatus = require('http-status-codes');
const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  // For production, implement pagination and filtering
  const users = await userService.queryUsers();
  res.send(users);
});

const getUser = catchAsync(async (req, res) => {
  let user;
  if (req.user.role === 'admin') {
    user = await userService.getUserById(req.params.userId);
  } else if (req.user.id === req.params.userId) {
    user = await userService.getUserById(req.params.userId);
  } else {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only view your own profile.');
  }

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  let user;
  if (req.user.role === 'admin') {
    user = await userService.updateUserById(req.params.userId, req.body);
  } else if (req.user.id === req.params.userId) {
    user = await userService.updateUserById(req.params.userId, req.body);
  } else {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only update your own profile.');
  }
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
```
import userService from './user.service.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

const getAllUsers = catchAsync(async (req, res) => {
  const features = new APIFeatures({}, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await userService.getAllUsers(features.build());
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

const updateUser = catchAsync(async (req, res) => {
  const updatedUser = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.status(204).send();
});

const assignRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  const updatedUser = await userService.assignUserRole(req.params.id, role);
  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    data: {
      user: updatedUser,
    },
  });
});

export default {
  getAllUsers,
  getUser,
  updateUser,
    deleteUser,
  assignRole,
};
```

```javascript
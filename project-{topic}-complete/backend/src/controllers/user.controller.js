```javascript
const httpStatus = require('http-status');
const User = require('../models/user.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getUsers = asyncHandler(async (req, res) => {
    const users = await db('users').select('id', 'username', 'email', 'role', 'created_at', 'updated_at');
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, users, 'Users retrieved successfully'));
});

const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, user, 'User retrieved successfully'));
});

const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { username, email, password, role } = req.body;

    // Admin can update any user, users can only update themselves
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId, 10)) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to update this user');
    }

    const updateBody = {};
    if (username) updateBody.username = username;
    if (email) updateBody.email = email;
    if (password) updateBody.password = password;
    if (role && req.user.role === 'admin') updateBody.role = role; // Only admin can change role

    const updatedUser = await User.update(userId, updateBody);
    if (!updatedUser) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, updatedUser, 'User updated successfully'));
});

const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Admin can delete any user, users cannot delete themselves this way
    if (req.user.role !== 'admin' || req.user.id === parseInt(userId, 10)) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to delete this user, or cannot delete yourself via this endpoint');
    }

    const deletedCount = await User.delete(userId);
    if (deletedCount === 0) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }
    res.status(httpStatus.NO_CONTENT).send(new ApiResponse(httpStatus.NO_CONTENT, null, 'User deleted successfully'));
});

module.exports = {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
};
```
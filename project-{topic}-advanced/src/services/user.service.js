```javascript
// src/services/user.service.js
const httpStatus = require('http-status');
const { User } = require('../models');
const { ApiError } = require('../utils/ApiError');

const createUser = async (userBody) => {
    // ALX Principle: Data Integrity
    // Ensure unique constraints and valid data before persistence.
    if (await User.isEmailTaken(userBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    // ALX Principle: Password Hashing (done in User model 'beforeCreate' hook)
    const user = await User.create(userBody);
    return user;
};

const queryUsers = async (filter, options) => {
    // ALX Principle: Pagination and Filtering
    // Implement efficient data retrieval with options for sorting and limiting.
    const users = await User.paginate(filter, options);
    return users;
};

const getUserById = async (id) => {
    return User.findByPk(id);
};

const getUserByEmail = async (email) => {
    return User.findOne({ where: { email } });
};

const updateUserById = async (userId, updateBody) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    Object.assign(user, updateBody);
    await user.save();
    return user;
};

const deleteUserById = async (userId) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    await user.destroy();
};

module.exports = {
    createUser,
    queryUsers,
    getUserById,
    getUserByEmail,
    updateUserById,
    deleteUserById,
};
```
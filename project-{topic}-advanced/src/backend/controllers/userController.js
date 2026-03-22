```javascript
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management operations (Admin only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - only administrators can access this resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
exports.getAllUsers = catchAsync(async (req, res) => {
    const users = await User.findAll({ attributes: { exclude: ['password'] } }); // Exclude passwords

    res.status(StatusCodes.OK).json({
        status: 'success',
        results: users.length,
        data: users,
    });
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - only administrators can access this resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
exports.getUserById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });

    if (!user) {
        return next(new AppError('User not found with that ID', StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: user,
    });
});

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update an existing user (Admin only, or user updating their own profile)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: updated@example.com
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: User role (only admin can change others' roles)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - unauthorized to update role or another user's profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
exports.updateUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { email, role } = req.body;
    const currentUser = req.user; // from protect middleware

    // Users can only update their own profile, unless they are an admin
    if (currentUser.id !== id && currentUser.role !== 'admin') {
        return next(new AppError('You are not authorized to update this user.', StatusCodes.FORBIDDEN));
    }

    // Only an admin can change roles
    if (role && currentUser.role !== 'admin') {
        return next(new AppError('You are not authorized to change user roles.', StatusCodes.FORBIDDEN));
    }

    const [updatedRowsCount, updatedUsers] = await User.update({ email, role }, {
        where: { id },
        returning: true,
        individualHooks: true // Needed for beforeUpdate hook to hash password if it was included (though not expected here)
    });

    if (updatedRowsCount === 0) {
        return next(new AppError('User not found with that ID', StatusCodes.NOT_FOUND));
    }

    // Exclude password from response
    const updatedUser = updatedUsers[0].toJSON();
    delete updatedUser.password;

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: updatedUser,
    });
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to delete
 *     responses:
 *       204:
 *         description: User deleted successfully (No Content)
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - only administrators can delete users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // Prevent admin from deleting themselves, or last admin
    if (req.user.id === id) {
        return next(new AppError('You cannot delete your own user account via this endpoint. Please contact support.', StatusCodes.FORBIDDEN));
    }

    const deletedRowCount = await User.destroy({ where: { id } });

    if (deletedRowCount === 0) {
        return next(new AppError('User not found with that ID', StatusCodes.NOT_FOUND));
    }

    res.status(StatusCodes.NO_CONTENT).json({
        status: 'success',
        data: null,
    });
});
```
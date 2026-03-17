```javascript
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');

class UserController {
  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Get all users (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: List of users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Users retrieved successfully."
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   *                     currentPage:
   *                       type: integer
   *                     users:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  getAllUsers = asyncHandler(async (req, res) => {
    const usersData = await userService.getAllUsers(req.query);
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: usersData,
    });
  });

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get a user by ID (Admin or owner only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the user to retrieve
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User retrieved successfully."
   *                 data:
   *                   $ref: '#/components/schemas/UserWithProducts'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);

    // Authorization check for non-admin users:
    // A regular user can only view their own profile.
    if (req.user.role !== 'admin' && req.user.id !== user.id) {
      throw new AppError('You are not authorized to view this user profile.', 403);
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully.',
      data: user,
    });
  });

  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Create a new user (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserInput'
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User created successfully."
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  createUser = asyncHandler(async (req, res) => {
    const newUser = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: newUser,
    });
  });

  /**
   * @swagger
   * /users/{id}:
   *   put:
   *     summary: Update a user by ID (Admin or owner only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the user to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserInput'
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User updated successfully."
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  updateUser = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;

    // Authorization check: Admin can update any user, a regular user can only update themselves.
    if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
      throw new AppError('You are not authorized to update this user.', 403);
    }

    // Prevent non-admins from changing their role or activation status
    if (req.user.role !== 'admin' && (req.body.role || req.body.isActivated)) {
      throw new AppError('You are not authorized to change user role or activation status.', 403);
    }

    const updatedUser = await userService.updateUser(targetUserId, req.body);
    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUser,
    });
  });

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Delete a user by ID (soft delete - Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the user to delete
   *     responses:
   *       204:
   *         description: User soft-deleted successfully (No Content)
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  deleteUser = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;

    // Prevent a user from deleting themselves (or an admin from deleting another admin in some cases)
    if (req.user.id === targetUserId) {
      throw new AppError('You cannot delete your own user account through this endpoint.', 403);
    }

    await userService.deleteUser(targetUserId);
    res.status(204).send(); // No content for successful deletion
  });

  /**
   * @swagger
   * /users/{id}/restore:
   *   post:
   *     summary: Restore a soft-deleted user by ID (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *           format: uuid
   *         required: true
   *         description: ID of the user to restore
   *     responses:
   *       200:
   *         description: User restored successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "User restored successfully."
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  restoreUser = asyncHandler(async (req, res) => {
    const restoredUser = await userService.restoreUser(req.params.id);
    res.status(200).json({
      success: true,
      message: 'User restored successfully.',
      data: restoredUser,
    });
  });
}

module.exports = new UserController();
```
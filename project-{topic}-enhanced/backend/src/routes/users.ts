```typescript
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile operations
 */

/**
 * @swagger
 * /api/users:
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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserWithoutPassword'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin role)
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, authorizeRoles(['admin']), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID (Admin or owner)
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
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserWithoutPassword'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or not owner)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a user by ID (Admin or owner)
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
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: User's role (only admin can change)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserWithoutPassword'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or not owner, or non-admin tried to change role)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a user by ID (Admin or owner)
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
 *         description: User deleted successfully (No Content)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or not owner)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.route('/:id')
  .get(authenticateToken, userController.getUserById)
  .put(authenticateToken, userController.updateUser)
  .delete(authenticateToken, userController.deleteUser);

export default router;
```
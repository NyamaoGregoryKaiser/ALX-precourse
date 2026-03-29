```typescript
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import logger from '../utils/logger';

const userService = new UserService();

/**
 * Controller for handling User-related API requests.
 * Routes requests to the UserService and sends back appropriate responses.
 */
export class UserController {
  /**
   * Get all users. Requires 'admin' role.
   * @param req Express Request object
   * @param res Express Response object
   */
  async getAllUsers(req: Request, res: Response): Promise<Response> {
    try {
      const users = await userService.getAllUsers();
      // Filter out passwords from response for security
      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      return res.status(200).json(usersWithoutPasswords);
    } catch (error: any) {
      logger.error(`Error fetching all users: ${error.message}`);
      return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
  }

  /**
   * Get a single user by ID. Requires 'admin' role or matching user ID.
   * @param req Express Request object (expects userId in params)
   * @param res Express Response object
   */
  async getUserById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    // Authorization check: User can only view their own profile unless they are admin
    if (req.user!.role !== 'admin' && req.user!.id !== id) {
      logger.warn(`Unauthorized access attempt: User ${req.user!.email} tried to view profile of user ID ${id}`);
      return res.status(403).json({ message: 'Forbidden: You can only view your own profile' });
    }

    try {
      const user = await userService.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Omit password from response
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error: any) {
      logger.error(`Error fetching user by ID ${id}: ${error.message}`);
      return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
  }

  /**
   * Update a user by ID. Requires 'admin' role or matching user ID.
   * @param req Express Request object (expects userId in params, update data in body)
   * @param res Express Response object
   */
  async updateUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { email, password, role } = req.body; // Allow partial updates

    // Authorization check: User can only update their own profile unless they are admin
    if (req.user!.role !== 'admin' && req.user!.id !== id) {
      logger.warn(`Unauthorized update attempt: User ${req.user!.email} tried to update profile of user ID ${id}`);
      return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
    }

    // Non-admin users cannot change their role
    if (req.user!.role !== 'admin' && role && role !== req.user!.role) {
      logger.warn(`Unauthorized role change attempt by user ${req.user!.email}`);
      return res.status(403).json({ message: 'Forbidden: You cannot change your role' });
    }

    try {
      const updatedUser = await userService.updateUser(id, { email, password, role });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Omit password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.status(200).json({ message: 'User updated successfully', user: userWithoutPassword });
    } catch (error: any) {
      logger.error(`Error updating user ${id}: ${error.message}`);
      return res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
  }

  /**
   * Delete a user by ID. Requires 'admin' role.
   * @param req Express Request object (expects userId in params)
   * @param res Express Response object
   */
  async deleteUser(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    // Admin only can delete other users, or a user can delete themselves
    if (req.user!.role !== 'admin' && req.user!.id !== id) {
      logger.warn(`Unauthorized deletion attempt: User ${req.user!.email} tried to delete user ID ${id}`);
      return res.status(403).json({ message: 'Forbidden: You can only delete your own account' });
    }

    try {
      const success = await userService.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(204).send(); // No content for successful deletion
    } catch (error: any) {
      logger.error(`Error deleting user ${id}: ${error.message}`);
      return res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
  }
}
```
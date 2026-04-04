```javascript
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const bcrypt = require('bcryptjs');

/**
 * User Service Module
 * Handles business logic for user management (excluding authentication).
 */
const userService = {
  /**
   * Retrieves a user by their ID.
   * @param {string} userId - The ID of the user to retrieve.
   * @returns {Promise<object>} The user object.
   * @throws {AppError} If the user is not found.
   */
  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    return user;
  },

  /**
   * Updates a user's profile.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - The data to update (e.g., username, email).
   * @returns {Promise<object>} The updated user object.
   * @throws {AppError} If the user is not found or if email/username already exists.
   */
  async updateProfile(userId, updateData) {
    // 1. Check if user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // 2. Prevent updating role via this endpoint
    if (updateData.role) {
      throw new AppError('Cannot update user role via this endpoint.', 403); // 403 Forbidden
    }

    // 3. Check for duplicate email/username if provided
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await userRepository.findByEmail(updateData.email);
      if (existingUser) {
        throw new AppError('Email already registered.', 409);
      }
    }

    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await userRepository.findByUsername(updateData.username);
      if (existingUser) {
        throw new AppError('Username already taken.', 409);
      }
    }

    // 4. Update user
    const updatedUser = await userRepository.update(userId, updateData);
    return updatedUser;
  },

  /**
   * Updates a user's password.
   * @param {string} userId - The ID of the user.
   * @param {string} currentPassword - The user's current password.
   * @param {string} newPassword - The new password.
   * @returns {Promise<object>} The updated user object (without password).
   * @throws {AppError} If user not found, current password incorrect, or new password is same as old.
   */
  async updatePassword(userId, currentPassword, newPassword) {
    // 1. Get user with password hash
    const user = await userRepository.findById(userId, true); // Need password for comparison
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // 2. Check if current password is correct
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      throw new AppError('Current password is incorrect.', 401);
    }

    // 3. Check if new password is different from current
    const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
    if (isNewPasswordSame) {
      throw new AppError('New password cannot be the same as the current password.', 400);
    }

    // 4. Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updatedUser = await userRepository.update(userId, { password: hashedPassword });

    return updatedUser;
  },

  /**
   * Deactivates a user account.
   * @param {string} userId - The ID of the user to deactivate.
   * @returns {Promise<void>}
   * @throws {AppError} If the user is not found.
   */
  async deactivateAccount(userId) {
    // In a real application, you might set a `isActive: false` flag
    // or a `deletedAt` timestamp instead of actual deletion for data retention.
    // For this example, we'll perform a soft-delete simulation by throwing an error
    // or a full delete for simplicity if desired.
    // Let's implement a full delete for simplicity but note the real-world implications.
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    await userRepository.delete(userId);
  },

  /**
   * Admin-only: Retrieves all users with pagination, filtering, and sorting.
   * @param {object} queryString - The query parameters from the request (req.query).
   * @returns {Promise<object>} An object containing results and total count.
   */
  async getAllUsers(queryString) {
    const features = new APIFeatures(userRepository.prisma.user, queryString)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const users = await features.execute();
    const totalCount = await features.count();

    return {
      results: users.length,
      total: totalCount,
      users,
    };
  },

  /**
   * Admin-only: Updates a user's role.
   * @param {string} userId - The ID of the user to update.
   * @param {string} role - The new role (e.g., 'ADMIN', 'USER').
   * @returns {Promise<object>} The updated user object.
   * @throws {AppError} If user not found or invalid role.
   */
  async updateUserRole(userId, role) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    if (!['USER', 'ADMIN'].includes(role.toUpperCase())) {
      throw new AppError('Invalid user role provided.', 400);
    }

    const updatedUser = await userRepository.update(userId, { role: role.toUpperCase() });
    return updatedUser;
  },

  /**
   * Admin-only: Deletes a user account.
   * @param {string} userId - The ID of the user to delete.
   * @returns {Promise<void>}
   * @throws {AppError} If the user is not found.
   */
  async deleteUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    await userRepository.delete(userId);
  },
};

module.exports = userService;
```
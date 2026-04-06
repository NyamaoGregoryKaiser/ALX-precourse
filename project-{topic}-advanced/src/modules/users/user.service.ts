```typescript
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/apiError';

export class UserService {
  /**
   * Retrieves a user by their ID.
   * @param userId The ID of the user.
   * @returns The user object.
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Retrieves a user by their email.
   * @param email The email of the user.
   * @returns The user object.
   */
  async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Updates user information.
   * @param userId The ID of the user to update.
   * @param updateData The data to update.
   * @returns The updated user object.
   */
  async updateUser(userId: string, updateData: { firstName?: string; lastName?: string; email?: string }) {
    // Check if the new email already exists for another user
    if (updateData.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: updateData.email } });
      if (existingUser && existingUser.id !== userId) {
        throw new ApiError(409, 'Email already in use by another user');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }

  /**
   * Deletes a user by their ID.
   * @param userId The ID of the user to delete.
   */
  async deleteUser(userId: string) {
    // In a real system, consider soft deletes or archiving for auditing purposes
    // Also, handle cascading deletes for related data (accounts, transactions)
    await prisma.user.delete({ where: { id: userId } });
    return { message: 'User deleted successfully' };
  }
}
```
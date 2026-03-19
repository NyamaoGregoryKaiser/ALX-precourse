```typescript
import { User, UserRole } from './user.entity';
import { UserRepository } from './user.repository';
import { CreateUserDTO, UpdateUserDTO, ChangePasswordDTO } from './user.dto';
import { BadRequestError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } from '../../utils/appErrors';
import logger from '../../utils/logger';

export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Get all users.
   * @returns A list of all users.
   */
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  /**
   * Get a user by ID.
   * @param id - The ID of the user.
   * @returns The user object.
   * @throws NotFoundError if the user does not exist.
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }
    return user;
  }

  /**
   * Create a new user.
   * @param userData - Data for the new user.
   * @returns The created user object.
   * @throws ConflictError if a user with the given email already exists.
   */
  async createUser(userData: CreateUserDTO): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('User with that email already exists.');
    }

    const newUser = await this.userRepository.create(userData);
    logger.info(`New user created: ${newUser.email} with role ${newUser.role}`);
    return newUser;
  }

  /**
   * Update an existing user.
   * @param id - The ID of the user to update.
   * @param userData - Data to update the user with.
   * @returns The updated user object.
   * @throws NotFoundError if the user does not exist.
   * @throws ConflictError if the new email already belongs to another user.
   */
  async updateUser(id: string, userData: UpdateUserDTO): Promise<User> {
    const userToUpdate = await this.userRepository.findById(id);
    if (!userToUpdate) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }

    if (userData.email && userData.email !== userToUpdate.email) {
      const existingUserWithEmail = await this.userRepository.findByEmail(userData.email);
      if (existingUserWithEmail && existingUserWithEmail.id !== id) {
        throw new ConflictError('Another user with that email already exists.');
      }
    }

    const updatedUser = await this.userRepository.update(id, userData);
    if (!updatedUser) {
      throw new NotFoundError(`User with ID ${id} not found during update process.`); // Should not happen if initial check passed
    }
    logger.info(`User ${updatedUser.email} updated.`);
    return updatedUser;
  }

  /**
   * Delete a user.
   * @param id - The ID of the user to delete.
   * @returns True if deletion was successful.
   * @throws NotFoundError if the user does not exist.
   */
  async deleteUser(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }
    const deleted = await this.userRepository.delete(id);
    if (deleted) {
      logger.info(`User ${id} deleted.`);
    }
    return deleted;
  }

  /**
   * Change a user's password.
   * @param userId - The ID of the user whose password to change.
   * @param passwordData - Object containing currentPassword, newPassword, confirmNewPassword.
   * @returns The updated user object.
   * @throws UnauthorizedError if current password is incorrect.
   * @throws NotFoundError if the user does not exist.
   */
  async changePassword(userId: string, passwordData: ChangePasswordDTO): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    // Must fetch user with password selected
    const userWithPassword = await this.userRepository.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'] // Explicitly select password
    });

    if (!userWithPassword || !(await userWithPassword.comparePassword(passwordData.currentPassword))) {
      throw new UnauthorizedError('Incorrect current password.');
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      throw new BadRequestError('New password and confirm new password do not match.');
    }

    // Update the password
    user.password = passwordData.newPassword;
    (user as any).markModified('password'); // Mark password as modified for BeforeUpdate hook
    const updatedUser = await this.userRepository.userRepository.save(user);

    logger.info(`User ${userId} password changed successfully.`);
    return updatedUser;
  }

  /**
   * Update user role.
   * @param userId - The ID of the user.
   * @param newRole - The new role to assign.
   * @returns The updated user object.
   * @throws NotFoundError if the user does not exist.
   * @throws BadRequestError if the new role is invalid.
   * @throws ForbiddenError if attempting to change admin role without proper authorization (e.g., from another admin).
   */
  async updateUserRole(userId: string, newRole: UserRole, requestingUser: User): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    if (!Object.values(UserRole).includes(newRole)) {
      throw new BadRequestError(`Invalid role: ${newRole}`);
    }

    // Prevent non-admins from changing admin roles or assigning admin role
    if (user.role === UserRole.ADMIN || newRole === UserRole.ADMIN) {
      if (requestingUser.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can manage admin roles.');
      }
    }

    user.role = newRole;
    const updatedUser = await this.userRepository.userRepository.save(user);
    logger.info(`User ${userId} role updated to ${newRole} by ${requestingUser.email}.`);
    return updatedUser;
  }
}
```
```typescript
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../utils/apiErrors';
import { hashPassword, comparePassword } from '../utils/password';
import { logger } from '../utils/logger';

class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private roleRepository = AppDataSource.getRepository(Role);

  public async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({ relations: ['role'] });
  }

  public async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }

  public async updateUser(userId: string, updateData: Partial<User>, requestorId: string, requestorRoleName: string): Promise<User> {
    const userToUpdate = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!userToUpdate) {
      throw new NotFoundError('User not found.');
    }

    // Authorization check
    // A user can only update their own profile, unless they are an admin
    if (userId !== requestorId && requestorRoleName !== 'admin') {
      throw new ForbiddenError('You do not have permission to update this user.');
    }

    // Admins can update roles, other users cannot
    if (updateData.roleId && requestorRoleName !== 'admin') {
      throw new ForbiddenError('You do not have permission to change user roles.');
    }

    if (updateData.email && updateData.email !== userToUpdate.email) {
      const existingUserWithEmail = await this.userRepository.findOneBy({ email: updateData.email });
      if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
        throw new ConflictError('Email already in use by another user.');
      }
      userToUpdate.email = updateData.email;
      // If email changes, it needs re-verification
      userToUpdate.isEmailVerified = false;
      // A new verification token should be generated and sent, but simplified here.
    }

    if (updateData.firstName) userToUpdate.firstName = updateData.firstName;
    if (updateData.lastName) userToUpdate.lastName = updateData.lastName;

    if (updateData.roleId) {
      const newRole = await this.roleRepository.findOneBy({ id: updateData.roleId });
      if (!newRole) {
        throw new BadRequestError('Invalid role ID provided.');
      }
      userToUpdate.role = newRole;
      userToUpdate.roleId = newRole.id;
    }

    const updatedUser = await this.userRepository.save(userToUpdate);

    const { password: _, verificationToken: __, verificationTokenExpires: ___, resetPasswordToken: ____, resetPasswordTokenExpires: _____, ...userWithoutSensitiveData } = updatedUser;
    return userWithoutSensitiveData;
  }

  public async deleteUser(userId: string, requestorId: string, requestorRoleName: string): Promise<void> {
    const userToDelete = await this.userRepository.findOneBy({ id: userId });

    if (!userToDelete) {
      throw new NotFoundError('User not found.');
    }

    // Authorization check: only admin can delete users, and cannot delete themselves (for safety)
    if (requestorRoleName !== 'admin' || userId === requestorId) {
      throw new ForbiddenError('You do not have permission to delete this user or cannot delete yourself.');
    }

    await this.userRepository.remove(userToDelete);
  }

  public async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string, requestorId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // A user can only change their own password
    if (userId !== requestorId) {
      throw new ForbiddenError('You do not have permission to change this user\'s password.');
    }

    if (!user.password || !(await comparePassword(currentPasswordPlain, user.password))) {
      throw new BadRequestError('Current password is incorrect.');
    }

    user.password = await hashPassword(newPasswordPlain);
    await this.userRepository.save(user);
    logger.info(`Password changed for user: ${user.email}`);
  }
}

export const userService = new UserService();
```
```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CustomLogger } from '../common/logger/custom-logger';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly logger: CustomLogger,
  ) {}

  /**
   * Retrieves a user by their ID.
   *
   * @param id The ID of the user.
   * @returns The user object.
   * @throws NotFoundException if the user is not found.
   */
  async getUserById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    this.logger.debug(`Fetched user ID: ${id}`, UsersService.name);
    return user;
  }

  /**
   * Updates an existing user's profile.
   * Allows updating username and password.
   * Handles password hashing if provided.
   * Throws ConflictException if new username already exists.
   *
   * @param id The ID of the user to update.
   * @param updateUserDto DTO containing updated user data.
   * @returns The updated user object (excluding password).
   * @throws NotFoundException if the user is not found.
   * @throws ConflictException if the new username is already taken.
   */
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id); // Ensures user exists

    // Check for username conflict if username is being updated
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUserWithNewUsername = await this.usersRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUserWithNewUsername) {
        throw new ConflictException(
          `Username "${updateUserDto.username}" already exists.`,
        );
      }
      user.username = updateUserDto.username;
    }

    // Hash new password if provided
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    try {
      await this.usersRepository.save(user);
      this.logger.log(`User ID: ${id} updated profile`, UsersService.name);
      // Return user without password for security
      const { password, ...result } = user;
      return result as User;
    } catch (error) {
      this.logger.error(
        `Failed to update user ID: ${id}. Error: ${error.message}`,
        error.stack,
        UsersService.name,
      );
      throw error;
    }
  }

  /**
   * Deletes a user by their ID.
   *
   * @param id The ID of the user to delete.
   * @throws NotFoundException if the user is not found.
   */
  async deleteUser(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    this.logger.log(`User ID: ${id} deleted`, UsersService.name);
  }
}
```
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from './enums/user-role.enum';
import { LoggerService } from '../utils/logger';

/**
 * Service responsible for business logic related to User entities.
 * It interacts with the database via TypeORM Repository.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private logger: LoggerService,
  ) {}

  /**
   * Creates a new user in the database.
   * By default, new users are assigned the 'USER' role.
   * @param createUserDto The DTO containing data for the new user.
   * @returns {Promise<User>} The newly created user entity.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Attempting to create user: ${createUserDto.email}`);
    const newUser = this.usersRepository.create({
      ...createUserDto,
      roles: createUserDto.roles || [UserRole.USER], // Assign default USER role
    });
    return this.usersRepository.save(newUser);
  }

  /**
   * Retrieves all users from the database.
   * @returns {Promise<User[]>} A list of all user entities.
   */
  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users.');
    return this.usersRepository.find({
      select: ['id', 'username', 'email', 'roles', 'createdAt', 'updatedAt'], // Exclude password
    });
  }

  /**
   * Retrieves a single user by their ID.
   * @param id The ID of the user to find.
   * @returns {Promise<User>} The found user entity.
   * @throws {NotFoundException} If the user with the given ID is not found.
   */
  async findOne(id: string): Promise<User> {
    this.logger.log(`Fetching user with ID: ${id}`);
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'roles', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      this.logger.warn(`User with ID ${id} not found.`);
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return user;
  }

  /**
   * Retrieves a user by their username.
   * @param username The username to search for.
   * @param withPassword Optional. If true, includes the password hash in the returned user object.
   * @returns {Promise<User | undefined>} The found user entity or undefined if not found.
   */
  async findByUsername(
    username: string,
    withPassword = false,
  ): Promise<User | undefined> {
    this.logger.log(`Fetching user by username: ${username}`);
    const selectOptions: Array<keyof User> = [
      'id',
      'username',
      'email',
      'roles',
    ];
    if (withPassword) {
      selectOptions.push('password');
    }
    return this.usersRepository.findOne({
      where: { username },
      select: selectOptions,
    });
  }

  /**
   * Retrieves a user by their email.
   * @param email The email to search for.
   * @returns {Promise<User | undefined>} The found user entity or undefined if not found.
   */
  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.log(`Fetching user by email: ${email}`);
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'username', 'email', 'roles'],
    });
  }

  /**
   * Updates an existing user's information.
   * @param id The ID of the user to update.
   * @param updateUserDto The DTO containing the updated user data.
   * @returns {Promise<User>} The updated user entity.
   * @throws {NotFoundException} If the user with the given ID is not found.
   * @throws {BadRequestException} If trying to update to an email/username that already exists.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Attempting to update user with ID: ${id}`);
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      this.logger.warn(`User with ID ${id} not found for update.`);
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email already in use by another user.');
      }
    }
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException(
          'Username already in use by another user.',
        );
      }
    }

    // Hash new password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Merge changes and save
    this.usersRepository.merge(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);

    this.logger.log(`User with ID ${id} updated successfully.`);
    // Return updated user without password
    const { password, ...result } = updatedUser;
    return result as User;
  }

  /**
   * Deletes a user from the database.
   * @param id The ID of the user to delete.
   * @returns {Promise<void>}
   * @throws {NotFoundException} If the user with the given ID is not found.
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Attempting to remove user with ID: ${id}`);
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`User with ID ${id} not found for deletion.`);
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    this.logger.log(`User with ID ${id} removed successfully.`);
  }
}
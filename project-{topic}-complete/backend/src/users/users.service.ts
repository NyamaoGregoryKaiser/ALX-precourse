import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly logger: AppLogger,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Attempting to create user: ${createUserDto.email}`, UsersService.name);
    const existingUser = await this.findByEmailOrUsername(createUserDto.email, createUserDto.username);
    if (existingUser) {
      throw new ConflictException('Email or username already exists.');
    }
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    this.logger.log('Fetching all users', UsersService.name);
    const users = await this.usersRepository.find();
    return users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    });
  }

  async findById(id: string): Promise<Omit<User, 'password'>> {
    this.logger.log(`Fetching user by ID: ${id}`, UsersService.name);
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    this.logger.log(`Fetching user by email: ${email}`, UsersService.name);
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailOrUsername(email: string, username: string): Promise<User | undefined> {
    this.logger.log(`Fetching user by email or username: ${email} | ${username}`, UsersService.name);
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email OR user.username = :username', { email, username })
      .getOne();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    this.logger.log(`Attempting to update user with ID: ${id}`, UsersService.name);
    const user = await this.usersRepository.preload({ id, ...updateUserDto });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (updateUserDto.email || updateUserDto.username) {
        const existingUser = await this.usersRepository
            .createQueryBuilder('user')
            .where('(user.email = :email OR user.username = :username) AND user.id != :id', {
                email: updateUserDto.email,
                username: updateUserDto.username,
                id,
            })
            .getOne();

        if (existingUser) {
            throw new ConflictException('Email or username already in use by another user.');
        }
    }

    await this.usersRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Attempting to remove user with ID: ${id}`, UsersService.name);
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
  }
}
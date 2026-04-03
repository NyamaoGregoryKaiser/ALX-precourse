```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = this.usersRepository.create(createUserDto);
    await this.usersRepository.save(newUser);
    this.logger.log(`User created: ${newUser.username}`, 'UsersService');
    return newUser;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`User with ID ${id} not found.`, 'UsersService');
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async findOneByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.preload({
      id: id,
      ...updateUserDto,
    });
    if (!user) {
      this.logger.warn(`User with ID ${id} not found for update.`, 'UsersService');
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    await this.usersRepository.save(user);
    this.logger.log(`User updated: ${user.username} (ID: ${id})`, 'UsersService');
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`User with ID ${id} not found for deletion.`, 'UsersService');
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    this.logger.log(`User with ID ${id} removed.`, 'UsersService');
  }
}
```
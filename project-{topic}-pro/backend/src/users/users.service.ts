```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum'; // Import the enum

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      ...createUserDto,
      roles: [UserRole.USER], // Default role for new users
    });
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'firstName', 'lastName', 'email', 'roles', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'firstName', 'lastName', 'email', 'roles', 'createdAt', 'updatedAt', 'password'], // Include password for auth validation
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'firstName', 'lastName', 'email', 'password', 'roles'], // Select password for authentication
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id); // Ensure user exists
    // Do not allow updating password or roles directly via this method without specific authorization/logic
    if (updateUserDto.password) {
      delete updateUserDto.password; // Prevent direct password update
    }
    if (updateUserDto.roles) {
      delete updateUserDto.roles; // Prevent direct role update
    }

    Object.assign(user, updateUserDto); // Apply updates
    const updatedUser = await this.usersRepository.save(user);

    // Remove password before returning
    delete updatedUser.password;
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
  }
}
```
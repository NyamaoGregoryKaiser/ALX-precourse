```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Mock TypeORM Repository
const mockUsersRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.AUTHOR,
    };

    it('should successfully create a user', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({
        ...createUserDto,
        passwordHash: 'hashedPassword',
        id: 'uuid-1',
      });
      userRepository.save.mockResolvedValue({
        ...createUserDto,
        passwordHash: 'hashedPassword',
        id: 'uuid-1',
      });

      const user = await service.create(createUserDto);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        passwordHash: 'hashedPassword',
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(user).toEqual(expect.objectContaining({ id: 'uuid-1', email: createUserDto.email }));
    });

    it('should throw ConflictException if user with email already exists', async () => {
      userRepository.findOne.mockResolvedValue(true); // User exists
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: '1', email: 'a@a.com' }, { id: '2', email: 'b@b.com' }];
      userRepository.find.mockResolvedValue(users);
      expect(await service.findAll()).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user = { id: 'uuid-1', email: 'test@example.com' };
      userRepository.findOne.mockResolvedValue(user);
      expect(await service.findOne('uuid-1')).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = { id: 'uuid-1', email: 'test@example.com' };
      userRepository.findOne.mockResolvedValue(user);
      expect(await service.findByEmail('test@example.com')).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      expect(await service.findByEmail('non-existent@example.com')).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = { firstName: 'Updated' };
    const existingUser = { id: 'uuid-1', email: 'test@example.com', firstName: 'Test' } as User;

    it('should update a user', async () => {
      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.save.mockResolvedValue({ ...existingUser, ...updateUserDto });

      const updatedUser = await service.update('uuid-1', updateUserDto);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(userRepository.save).toHaveBeenCalledWith({ ...existingUser, ...updateUserDto });
      expect(updatedUser).toEqual(expect.objectContaining({ firstName: 'Updated' }));
    });

    it('should throw NotFoundException if user to update not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.update('non-existent-id', updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle password update correctly', async () => {
      const updatePasswordDto: UpdateUserDto = { password: 'newPassword' };
      userRepository.findOne.mockResolvedValue(existingUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword' as never);
      userRepository.save.mockResolvedValue({ ...existingUser, passwordHash: 'newHashedPassword' });

      await service.update('uuid-1', updatePasswordDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'newHashedPassword' }));
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const userToRemove = { id: 'uuid-1', email: 'test@example.com' } as User;
      userRepository.findOne.mockResolvedValue(userToRemove);
      userRepository.remove.mockResolvedValue(userToRemove);

      const removedUser = await service.remove('uuid-1');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(userRepository.remove).toHaveBeenCalledWith(userToRemove);
      expect(removedUser).toEqual(userToRemove);
    });

    it('should throw NotFoundException if user to remove not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```
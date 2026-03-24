```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import * as bcrypt from 'bcrypt';

// Mock the bcrypt module to prevent actual hashing during tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUsersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset mocks before each test
    for (const key in mockUsersRepository) {
      if (typeof mockUsersRepository[key] === 'function') {
        mockUsersRepository[key].mockReset();
      }
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a user', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      };
      const newUser = { ...createUserDto, id: 'uuid-1', roles: [UserRole.USER], password: 'hashedPassword123' };

      mockUsersRepository.create.mockReturnValue(newUser);
      mockUsersRepository.save.mockResolvedValue(newUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword123',
        roles: [UserRole.USER],
      });
      expect(mockUsersRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(newUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: 'uuid-1', email: 'a@a.com', firstName: 'A', lastName: 'A', roles: [UserRole.USER] }];
      mockUsersRepository.find.mockResolvedValue(users);

      const result = await service.findAll();
      expect(result).toEqual(users);
      expect(mockUsersRepository.find).toHaveBeenCalledWith({
        select: ['id', 'firstName', 'lastName', 'email', 'roles', 'createdAt', 'updatedAt'],
      });
    });
  });

  describe('findById', () => {
    it('should return a single user', async () => {
      const user = { id: 'uuid-1', email: 'a@a.com', firstName: 'A', lastName: 'A', password: 'hashedPassword' };
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.findById('uuid-1');
      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        select: ['id', 'firstName', 'lastName', 'email', 'roles', 'createdAt', 'updatedAt', 'password'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = { id: 'uuid-1', email: 'a@a.com', firstName: 'A', lastName: 'A', password: 'hashedPassword' };
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('a@a.com');
      expect(result).toEqual(user);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'a@a.com' },
        select: ['id', 'firstName', 'lastName', 'email', 'password', 'roles'],
      });
    });

    it('should return undefined if user not found by email', async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findByEmail('non-existent@example.com');
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should successfully update a user', async () => {
      const existingUser = { id: 'uuid-1', firstName: 'Old', lastName: 'Name', email: 'old@example.com', password: 'hashedPassword', roles: [UserRole.USER] };
      const updateUserDto: UpdateUserDto = { firstName: 'New', lastName: 'User' };
      const updatedUser = { ...existingUser, ...updateUserDto };

      mockUsersRepository.findOne.mockResolvedValue(existingUser); // For findById call
      mockUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('uuid-1', updateUserDto);
      expect(result).toEqual({ ...updatedUser, password: undefined }); // Password should be undefined in returned object
      expect(mockUsersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'New' }));
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      await expect(service.update('non-existent-id', { firstName: 'New' })).rejects.toThrow(NotFoundException);
    });

    it('should not allow updating password or roles directly', async () => {
      const existingUser = { id: 'uuid-1', firstName: 'Old', lastName: 'Name', email: 'old@example.com', password: 'hashedPassword', roles: [UserRole.USER] };
      const updateUserDto: UpdateUserDto = {
        firstName: 'New',
        password: 'newPassword123', // Should be ignored
        roles: [UserRole.ADMIN], // Should be ignored
      };
      const expectedUserAfterUpdate = { ...existingUser, firstName: 'New' };

      mockUsersRepository.findOne.mockResolvedValue(existingUser);
      mockUsersRepository.save.mockResolvedValue(expectedUserAfterUpdate);

      const result = await service.update('uuid-1', updateUserDto);

      expect(result).toEqual({ ...expectedUserAfterUpdate, password: undefined });
      expect(mockUsersRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'New',
        password: 'hashedPassword', // Password should remain unchanged from existingUser
        roles: [UserRole.USER], // Roles should remain unchanged from existingUser
      }));
    });
  });

  describe('remove', () => {
    it('should successfully delete a user', async () => {
      mockUsersRepository.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
      expect(mockUsersRepository.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException if user to delete is not found', async () => {
      mockUsersRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```
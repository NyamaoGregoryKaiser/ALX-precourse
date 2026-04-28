import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';
import { AppLogger } from '../common/logger/app-logger.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(`hashed_${password}` === hash)),
}));

const mockUser: User = {
  id: 'uuid-1',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed_password123',
  role: Role.User,
  createdAt: new Date(),
  updatedAt: new Date(),
  datasets: [],
  models: [],
  predictionLogs: []
};

const mockAdminUser: User = {
    ...mockUser,
    id: 'uuid-2',
    username: 'adminuser',
    email: 'admin@example.com',
    role: Role.Admin,
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let appLogger: AppLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: AppLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    appLogger = module.get<AppLogger>(AppLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: Role.User,
      };

      jest.spyOn(service, 'findByEmailOrUsername').mockResolvedValue(undefined);
      jest.spyOn(repository, 'create').mockReturnValue(createUserDto as User);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
          username: createUserDto.username,
          email: createUserDto.email,
          password: `hashed_${createUserDto.password}`
      }));
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email or username already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: Role.User,
      };

      jest.spyOn(service, 'findByEmailOrUsername').mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of users without passwords', async () => {
      const users = [mockUser, mockAdminUser];
      jest.spyOn(repository, 'find').mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users.map(u => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, ...rest } = u;
          return rest;
      }));
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a single user without password', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findById('uuid-1');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = mockUser;
      expect(result).toEqual(expectedResult);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user including password if found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return undefined if user not found by email', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should return a user if found by email', async () => {
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByEmailOrUsername('test@example.com', 'nonexistent');

      expect(result).toEqual(mockUser);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
    });

    it('should return a user if found by username', async () => {
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByEmailOrUsername('nonexistent@example.com', 'testuser');

      expect(result).toEqual(mockUser);
    });

    it('should return undefined if user not found by email or username', async () => {
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.findByEmailOrUsername('nonexistent@example.com', 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update a user and return it without password', async () => {
      const updateUserDto: UpdateUserDto = { username: 'updateduser' };
      const updatedUser = { ...mockUser, username: 'updateduser' };

      jest.spyOn(repository, 'preload').mockResolvedValue(updatedUser);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedUser);
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(undefined),
      } as any); // No conflict

      const result = await service.update('uuid-1', updateUserDto);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = updatedUser;
      expect(repository.preload).toHaveBeenCalledWith({ id: 'uuid-1', ...updateUserDto });
      expect(repository.save).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual(expectedResult);
    });

    it('should hash password if provided in update', async () => {
        const updateUserDto: UpdateUserDto = { password: 'newpassword123' };
        const userAfterPreload = { ...mockUser, password: 'newpassword123' }; // Preload would assign raw password
        const userAfterSave = { ...mockUser, password: 'hashed_newpassword123' }; // save would hash it

        jest.spyOn(repository, 'preload').mockResolvedValue(userAfterPreload);
        jest.spyOn(repository, 'save').mockResolvedValue(userAfterSave);
        jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(undefined),
        } as any);

        await service.update('uuid-1', updateUserDto);

        expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            password: 'hashed_newpassword123'
        }));
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      jest.spyOn(repository, 'preload').mockResolvedValue(undefined);

      await expect(service.update('non-existent-id', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated email/username already exists', async () => {
        const updateUserDto: UpdateUserDto = { email: 'another@example.com' };
        const existingUserWithNewEmail = { ...mockAdminUser, email: 'another@example.com' };

        jest.spyOn(repository, 'preload').mockResolvedValue(mockUser);
        jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(existingUserWithNewEmail), // Conflict found
        } as any);

        await expect(service.update('uuid-1', updateUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      await service.remove('uuid-1');

      expect(repository.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException if user to delete is not found', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
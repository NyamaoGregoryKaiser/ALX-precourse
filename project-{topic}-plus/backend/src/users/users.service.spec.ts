```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashedpassword',
  role: UserRole.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  scrapingJobs: [],
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository, // Use actual Repository methods or mock them
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      jest.spyOn(repository, 'create').mockReturnValue(mockUser);
      jest.spyOn(repository, 'save').mockResolvedValue(mockUser);

      const result = await service.create({
        username: mockUser.username,
        email: mockUser.email,
        password: 'rawpassword',
        role: mockUser.role,
      });

      expect(repository.create).toHaveBeenCalledWith({
        username: mockUser.username,
        email: mockUser.email,
        password: 'rawpassword',
        role: mockUser.role,
      });
      expect(repository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      jest.spyOn(repository, 'find').mockResolvedValue(users);

      expect(await service.findAll()).toEqual(users);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user by ID', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      expect(await service.findOne('1')).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUsername', () => {
    it('should return a user by username', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      expect(await service.findOneByUsername('testuser')).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return undefined if user not found by username', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      expect(await service.findOneByUsername('nonexistent')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updatedUser = { ...mockUser, username: 'updateduser' };
      jest.spyOn(repository, 'preload').mockResolvedValue(updatedUser);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedUser);

      const result = await service.update('1', { username: 'updateduser' });

      expect(repository.preload).toHaveBeenCalledWith({
        id: '1',
        username: 'updateduser',
      });
      expect(repository.save).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user to update not found', async () => {
      jest.spyOn(repository, 'preload').mockResolvedValue(undefined);

      await expect(service.update('999', { username: 'nonexistent' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      await service.remove('1');
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if user to remove not found', async () => {
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```
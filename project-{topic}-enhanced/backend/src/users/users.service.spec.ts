```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt for password hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`)),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;

  const mockUsersRepository = {
    create: jest.fn(dto => ({ id: 'new-uuid', ...dto })),
    save: jest.fn(user => Promise.resolve(user)),
    find: jest.fn(() => Promise.resolve([new User(), new User()])),
    findOne: jest.fn(options => {
      if (options.where && options.where.id === 'found-id') {
        return Promise.resolve({ id: 'found-id', username: 'testuser', email: 'test@example.com', role: UserRole.AUTHOR, validatePassword: jest.fn(() => true) });
      }
      if (options.where && options.where.email === 'test@example.com') {
        return Promise.resolve({ id: 'found-id', username: 'testuser', email: 'test@example.com', role: UserRole.AUTHOR, validatePassword: jest.fn(() => true) });
      }
      return Promise.resolve(null);
    }),
    findOneBy: jest.fn(criteria => {
      if (criteria.id === 'found-id') {
        return Promise.resolve({ id: 'found-id', username: 'testuser', email: 'test@example.com', role: UserRole.AUTHOR, validatePassword: jest.fn(() => true) });
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn(id => Promise.resolve({ affected: id === 'found-id' ? 1 : 0 })),
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
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a user', async () => {
      (mockUsersRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing user
      const createUserDto = { username: 'newuser', email: 'new@example.com', password: 'password123', role: UserRole.AUTHOR };
      const result = await service.create(createUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { username: createUserDto.username } });
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'new-uuid', ...createUserDto, password: `hashed_password123` });
    });

    it('should throw BadRequestException if email already exists', async () => {
      (mockUsersRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ email: 'existing@example.com' }); // First call for email
      const createUserDto = { username: 'newuser', email: 'existing@example.com', password: 'password123', role: UserRole.AUTHOR };
      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if username already exists', async () => {
      (mockUsersRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // First call for email (no conflict)
        .mockResolvedValueOnce({ username: 'existinguser' }); // Second call for username (conflict)
      const createUserDto = { username: 'existinguser', email: 'new@example.com', password: 'password123', role: UserRole.AUTHOR };
      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = await service.findAll();
      expect(users).toEqual([new User(), new User()]);
      expect(userRepository.find).toHaveBeenCalledWith({ relations: ['posts'] });
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const user = await service.findOne('found-id');
      expect(user).toEqual({ id: 'found-id', username: 'testuser', email: 'test@example.com', role: UserRole.AUTHOR, validatePassword: expect.any(Function) });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'found-id' }, relations: ['posts'] });
    });

    it('should throw NotFoundException if user not found', async () => {
      (mockUsersRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('not-found-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const existingUser = { id: 'found-id', username: 'olduser', email: 'old@example.com', password: 'old_hashed_password', role: UserRole.AUTHOR };
      (mockUsersRepository.findOneBy as jest.Mock).mockResolvedValue(existingUser);
      (mockUsersRepository.findOne as jest.Mock).mockResolvedValue(null); // No email/username conflicts

      const updateUserDto = { username: 'updateduser', email: 'updated@example.com' };
      const result = await service.update('found-id', updateUserDto);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 'found-id' });
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...existingUser,
        username: 'updateduser',
        email: 'updated@example.com',
      }));
      expect(result.username).toEqual('updateduser');
      expect(result.email).toEqual('updated@example.com');
    });

    it('should hash new password if provided', async () => {
      const existingUser = { id: 'found-id', username: 'olduser', email: 'old@example.com', password: 'old_hashed_password', role: UserRole.AUTHOR };
      (mockUsersRepository.findOneBy as jest.Mock).mockResolvedValue(existingUser);
      (mockUsersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const updateUserDto = { password: 'newpassword123' };
      await service.update('found-id', updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        password: 'hashed_newpassword123',
      }));
    });

    it('should throw NotFoundException if user to update not found', async () => {
      (mockUsersRepository.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(service.update('not-found-id', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if new email already exists', async () => {
      const existingUser = { id: 'found-id', username: 'olduser', email: 'old@example.com', password: 'old_hashed_password', role: UserRole.AUTHOR };
      (mockUsersRepository.findOneBy as jest.Mock).mockResolvedValue(existingUser);
      (mockUsersRepository.findOne as jest.Mock).mockResolvedValue({ id: 'other-id', email: 'taken@example.com' }); // Email conflict

      await expect(service.update('found-id', { email: 'taken@example.com' })).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should successfully remove a user', async () => {
      await service.remove('found-id');
      expect(userRepository.delete).toHaveBeenCalledWith('found-id');
    });

    it('should throw NotFoundException if user to remove not found', async () => {
      await expect(service.remove('not-found-id')).rejects.toThrow(NotFoundException);
      expect(userRepository.delete).toHaveBeenCalledWith('not-found-id');
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const user = await service.findByEmail('test@example.com');
      expect(user).toEqual({ id: 'found-id', username: 'testuser', email: 'test@example.com', role: UserRole.AUTHOR, validatePassword: expect.any(Function) });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null if user not found by email', async () => {
      (mockUsersRepository.findOne as jest.Mock).mockResolvedValue(null);
      const user = await service.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });
});
```
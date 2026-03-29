import * as userService from '@/modules/users/user.service';
import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { UserRole } from '@/entities/UserRole';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import { clearDb } from '../setup';

// Mock TypeORM repositories
const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
};

const mockRoleRepository = {
  findOneBy: jest.fn(),
  findBy: jest.fn(),
};

const mockUserRoleRepository = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      if (entity === User) return mockUserRepository;
      if (entity === Role) return mockRoleRepository;
      if (entity === UserRole) return mockUserRoleRepository;
      return {};
    }),
  },
}));


describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should successfully create a new user with default role', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // No existing email/username
      const createdUser = {
        id: 'newUserId',
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'hashedPassword',
        firstName: 'New',
        lastName: 'User',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockRoleRepository.findOneBy.mockResolvedValue({ id: 'defaultRoleId', name: 'user' });
      mockUserRoleRepository.create.mockReturnValue({ userId: 'newUserId', roleId: 'defaultRoleId' });
      mockUserRoleRepository.save.mockResolvedValue([{}]);

      // Mock getUserById internally for the return value
      mockUserRepository.findOne.mockResolvedValue({
        ...createdUser,
        userRoles: [{ role: { name: 'user' } }],
      });

      const userData = { username: 'newuser', email: 'newuser@example.com', password: 'password123', firstName: 'New', lastName: 'User' };
      const user = await userService.createUser(userData);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ username: userData.username });
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(mockUserRepository.save).toHaveBeenCalledWith(createdUser);
      expect(mockRoleRepository.findOneBy).toHaveBeenCalledWith({ name: 'user' });
      expect(mockUserRoleRepository.save).toHaveBeenCalled();
      expect(user).toHaveProperty('id', 'newUserId');
      expect(user.roles).toContain('user');
    });

    it('should throw ApiError if email is already taken', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce({ id: 'existingId', email: 'test@example.com' });

      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      await expect(userService.createUser(userData)).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Email already taken'));
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ApiError if username is already taken', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null);
      mockUserRepository.findOneBy.mockResolvedValueOnce({ id: 'existingId', username: 'testuser' });

      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      await expect(userService.createUser(userData)).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Username already taken'));
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should assign specified roles', async () => {
      mockUserRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const createdUser = { id: 'newUserId', username: 'adminuser', email: 'admin@example.com', password: 'hashedPassword' };
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);
      mockRoleRepository.findBy.mockResolvedValue([{ id: 'adminRole1', name: 'admin' }]);
      mockUserRoleRepository.create.mockReturnValue({ userId: 'newUserId', roleId: 'adminRole1' });
      mockUserRoleRepository.save.mockResolvedValue([{}]);

      mockUserRepository.findOne.mockResolvedValue({
        ...createdUser,
        userRoles: [{ role: { name: 'admin' } }],
      });

      const userData = { username: 'adminuser', email: 'admin@example.com', password: 'password123', roleIds: ['adminRole1'] };
      const user = await userService.createUser(userData);

      expect(mockRoleRepository.findBy).toHaveBeenCalledWith({ id: ['adminRole1'] });
      expect(user.roles).toContain('admin');
    });
  });

  describe('getUsers', () => {
    it('should return all users with their roles', async () => {
      const mockUsers = [
        {
          id: 'user1',
          username: 'userone',
          email: 'one@example.com',
          firstName: 'One',
          lastName: 'User',
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [{ role: { name: 'user' } }],
        },
        {
          id: 'user2',
          username: 'usertwo',
          email: 'two@example.com',
          firstName: 'Two',
          lastName: 'User',
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          userRoles: [{ role: { name: 'editor' } }],
        },
      ];
      mockUserRepository.find.mockResolvedValue(mockUsers);

      const users = await userService.getUsers();

      expect(mockUserRepository.find).toHaveBeenCalledWith({ relations: ['userRoles.role'] });
      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('userone');
      expect(users[0].roles).toContain('user');
      expect(users[1].roles).toContain('editor');
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      const mockUser = {
        id: 'testUserId',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: { name: 'user' } }],
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const user = await userService.getUserById('testUserId');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'testUserId' },
        relations: ['userRoles.role'],
      });
      expect(user).toHaveProperty('username', 'testuser');
      expect(user!.roles).toContain('user');
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const user = await userService.getUserById('nonExistentId');

      expect(user).toBeNull();
    });
  });

  describe('updateUserById', () => {
    it('should successfully update user details', async () => {
      const existingUser = {
        id: 'userId1',
        username: 'olduser',
        email: 'old@example.com',
        password: 'hashedPassword',
        firstName: 'Old',
        lastName: 'User',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: { id: 'role1', name: 'user' } }],
      };
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({ ...existingUser, username: 'newusername' });

      // Mock for getUserById after update
      mockUserRepository.findOne.mockResolvedValue({
        ...existingUser,
        username: 'newusername',
        userRoles: [{ role: { id: 'role1', name: 'user' } }],
      });

      const updateBody = { username: 'newusername', firstName: 'New' };
      const updatedUser = await userService.updateUserById('userId1', updateBody);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'userId1' });
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({ username: 'newusername', firstName: 'New' }));
      expect(updatedUser).toHaveProperty('username', 'newusername');
      expect(updatedUser).toHaveProperty('firstName', 'New');
    });

    it('should throw ApiError if user not found for update', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(userService.updateUserById('nonExistentId', { username: 'new' })).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
    });

    it('should throw ApiError if new email is already taken', async () => {
      const existingUser = { id: 'userId1', username: 'user1', email: 'user1@example.com' };
      mockUserRepository.findOneBy.mockResolvedValueOnce(existingUser); // For finding user to update
      mockUserRepository.findOneBy.mockResolvedValueOnce({ id: 'userId2', email: 'taken@example.com' }); // For checking new email

      await expect(userService.updateUserById('userId1', { email: 'taken@example.com' })).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'Email already taken'));
    });

    it('should correctly update user roles', async () => {
      const existingUser = {
        id: 'userId1',
        username: 'user1',
        email: 'user1@example.com',
        userRoles: [{ role: { id: 'role1', name: 'user' } }],
      };
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser); // User entity save
      mockUserRoleRepository.delete.mockResolvedValue({});

      const newRole = { id: 'role2', name: 'editor' };
      mockRoleRepository.findBy.mockResolvedValue([newRole]);
      mockUserRoleRepository.create.mockReturnValue({ userId: 'userId1', roleId: 'role2' });
      mockUserRoleRepository.save.mockResolvedValue([{}]);

      // Mock for getUserById after update
      mockUserRepository.findOne.mockResolvedValue({
        ...existingUser,
        userRoles: [{ role: { name: 'editor' } }],
      });

      const updateBody = { roleIds: ['role2'] };
      const updatedUser = await userService.updateUserById('userId1', updateBody);

      expect(mockUserRoleRepository.delete).toHaveBeenCalledWith({ userId: 'userId1' });
      expect(mockRoleRepository.findBy).toHaveBeenCalledWith({ id: ['role2'] });
      expect(mockUserRoleRepository.save).toHaveBeenCalled();
      expect(updatedUser.roles).toEqual(['editor']);
    });

    it('should throw ApiError if new roles for update do not exist', async () => {
      const existingUser = {
        id: 'userId1',
        username: 'user1',
        email: 'user1@example.com',
        userRoles: [],
      };
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);
      mockUserRoleRepository.delete.mockResolvedValue({});
      mockRoleRepository.findBy.mockResolvedValue([]); // No roles found

      const updateBody = { roleIds: ['nonExistentRole'] };
      await expect(userService.updateUserById('userId1', updateBody)).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'One or more specified roles for update do not exist.'));
      expect(mockUserRoleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserById', () => {
    it('should successfully delete a user', async () => {
      const existingUser = { id: 'userId1', username: 'user1', email: 'user1@example.com' };
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);
      mockUserRepository.remove.mockResolvedValue(existingUser);

      await userService.deleteUserById('userId1');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'userId1' });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(existingUser);
    });

    it('should throw ApiError if user not found for deletion', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(userService.deleteUserById('nonExistentId')).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'User not found'));
    });
  });
});
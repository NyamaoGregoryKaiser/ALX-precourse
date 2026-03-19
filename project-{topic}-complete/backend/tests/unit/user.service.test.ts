```typescript
import { UserService } from '../../src/modules/users/user.service';
import { UserRepository } from '../../src/modules/users/user.repository';
import { User, UserRole } from '../../src/modules/users/user.entity';
import { BadRequestError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } from '../../src/utils/appErrors';

// Mock UserRepository
const mockUserRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  // For changePassword, we need to mock the underlying TypeORM repository directly for specific select options
  userRepository: {
    findOne: jest.fn(),
    save: jest.fn(),
  },
};

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(mockUserRepository as unknown as UserRepository);
    jest.clearAllMocks(); // Clear mock calls before each test
  });

  const mockUser: User = {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'hashedpassword', // Should not be returned in real scenarios, but needed for compare
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    orders: [],
    cart: {} as any, // Mock Cart
    setNew: jest.fn(),
    markModified: jest.fn(),
    isModified: jest.fn(),
    hashPassword: jest.fn().mockResolvedValue(undefined),
    comparePassword: jest.fn().mockResolvedValue(true),
  };

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      mockUserRepository.findAll.mockResolvedValue([mockUser]);
      const users = await userService.getAllUsers();
      expect(users).toEqual([mockUser]);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const user = await userService.getUserById(mockUser.id);
      expect(user).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.getUserById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createUser', () => {
    const newUserDto = {
      firstName: 'New',
      lastName: 'User',
      email: 'new@example.com',
      password: 'Password123!',
      role: UserRole.CUSTOMER,
    };

    it('should create a new user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      const user = await userService.createUser(newUserDto);
      expect(user).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(newUserDto.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(newUserDto);
    });

    it('should throw ConflictError if user with email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      await expect(userService.createUser(newUserDto)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const updateUserDto = { firstName: 'UpdatedName' };

    it('should update a user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(null); // No email conflict
      mockUserRepository.update.mockResolvedValue({ ...mockUser, ...updateUserDto });

      const updatedUser = await userService.updateUser(mockUser.id, updateUserDto);
      expect(updatedUser).toEqual({ ...mockUser, ...updateUserDto });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.updateUser('non-existent-id', updateUserDto)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if new email already exists for another user', async () => {
      const emailConflictUser: User = { ...mockUser, id: 'another-user-id', email: 'other@example.com' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(emailConflictUser); // Mock another user with the email
      await expect(userService.updateUser(mockUser.id, { email: 'other@example.com' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(true);
      const result = await userService.deleteUser(mockUser.id);
      expect(result).toBe(true);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.deleteUser('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('changePassword', () => {
    const passwordData = { currentPassword: 'OldPassword1!', newPassword: 'NewPassword1!', confirmNewPassword: 'NewPassword1!' };
    const userWithHashedPassword = { ...mockUser, password: 'hashedOldPassword', comparePassword: jest.fn().mockResolvedValue(true) };

    it('should change user password successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.userRepository.findOne.mockResolvedValue(userWithHashedPassword);
      mockUserRepository.userRepository.save.mockResolvedValue({ ...mockUser, password: 'newHashedPassword' });

      const updatedUser = await userService.changePassword(mockUser.id, passwordData);
      expect(updatedUser).toBeDefined();
      expect(userWithHashedPassword.comparePassword).toHaveBeenCalledWith(passwordData.currentPassword);
      expect(mockUserRepository.userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: mockUser.id,
        password: passwordData.newPassword, // The service sets plain password, entity hook hashes it
      }));
    });

    it('should throw NotFoundError if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.changePassword('non-existent-id', passwordData)).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError if current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.userRepository.findOne.mockResolvedValue({ ...userWithHashedPassword, comparePassword: jest.fn().mockResolvedValue(false) });
      await expect(userService.changePassword(mockUser.id, passwordData)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw BadRequestError if new passwords do not match', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.userRepository.findOne.mockResolvedValue(userWithHashedPassword);
      await expect(userService.changePassword(mockUser.id, { ...passwordData, confirmNewPassword: 'Mismatch!' })).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateUserRole', () => {
    const adminUser = { ...mockUser, id: 'admin-id', role: UserRole.ADMIN };
    const customerUser = { ...mockUser, id: 'customer-id', role: UserRole.CUSTOMER };
    const sellerUser = { ...mockUser, id: 'seller-id', role: UserRole.SELLER };

    it('should update a user role by admin', async () => {
      mockUserRepository.findById.mockResolvedValue(customerUser);
      mockUserRepository.userRepository.save.mockResolvedValue({ ...customerUser, role: UserRole.SELLER });

      const updatedUser = await userService.updateUserRole(customerUser.id, UserRole.SELLER, adminUser);
      expect(updatedUser.role).toBe(UserRole.SELLER);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(customerUser.id);
      expect(mockUserRepository.userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.SELLER }));
    });

    it('should throw NotFoundError if user to update does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(userService.updateUserRole('non-existent-id', UserRole.SELLER, adminUser)).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if new role is invalid', async () => {
      mockUserRepository.findById.mockResolvedValue(customerUser);
      await expect(userService.updateUserRole(customerUser.id, 'invalid_role' as UserRole, adminUser)).rejects.toThrow(BadRequestError);
    });

    it('should throw ForbiddenError if non-admin tries to change admin role', async () => {
      mockUserRepository.findById.mockResolvedValue(adminUser); // User to update is admin
      await expect(userService.updateUserRole(adminUser.id, UserRole.CUSTOMER, customerUser)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if non-admin tries to assign admin role', async () => {
      mockUserRepository.findById.mockResolvedValue(customerUser); // User to update is customer
      await expect(userService.updateUserRole(customerUser.id, UserRole.ADMIN, sellerUser)).rejects.toThrow(ForbiddenError);
    });
  });
});
```
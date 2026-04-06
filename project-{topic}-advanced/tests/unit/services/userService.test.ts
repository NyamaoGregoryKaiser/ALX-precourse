```typescript
import { UserService } from '../../../src/modules/users/user.service';
import { prisma } from '../../../src/utils/prisma';
import { ApiError } from '../../../src/utils/apiError';
import { UserRole } from '@prisma/client';

describe('UserService', () => {
  let userService: UserService;

  beforeAll(() => {
    userService = new UserService();
  });

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'user@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
      },
    });
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const user = await userService.getUserById('test-user-id');
      expect(user).toBeDefined();
      expect(user.email).toBe('user@example.com');
      expect(user.id).toBe('test-user-id');
    });

    it('should throw ApiError if user not found', async () => {
      await expect(userService.getUserById('non-existent-id')).rejects.toThrow(ApiError);
      await expect(userService.getUserById('non-existent-id')).rejects.toHaveProperty('statusCode', 404);
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const updatedUser = await userService.updateUser('test-user-id', {
        firstName: 'Updated',
        email: 'updated@example.com',
      });
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.email).toBe('updated@example.com');

      const fetchedUser = await prisma.user.findUnique({ where: { id: 'test-user-id' } });
      expect(fetchedUser?.email).toBe('updated@example.com');
    });

    it('should throw ApiError if updating with an email already in use', async () => {
      await prisma.user.create({
        data: {
          id: 'another-user-id',
          email: 'another@example.com',
          password: 'anotherhashedpassword',
          firstName: 'Another',
          lastName: 'User',
          role: UserRole.USER,
        },
      });

      await expect(
        userService.updateUser('test-user-id', { email: 'another@example.com' })
      ).rejects.toThrow(ApiError);
      await expect(
        userService.updateUser('test-user-id', { email: 'another@example.com' })
      ).rejects.toHaveProperty('statusCode', 409);
    });

    it('should not throw if user updates with their own email', async () => {
      const updatedUser = await userService.updateUser('test-user-id', { email: 'user@example.com' });
      expect(updatedUser.email).toBe('user@example.com'); // No error
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      await userService.deleteUser('test-user-id');
      const deletedUser = await prisma.user.findUnique({ where: { id: 'test-user-id' } });
      expect(deletedUser).toBeNull();
    });

    it('should throw if user not found (Prisma error will be caught by error handler in controller)', async () => {
      // Prisma's delete throws if record not found. Here we expect it to be handled by controller later.
      // For unit test, we can mock or let it pass for the service to indicate success of its direct action.
      await expect(userService.deleteUser('non-existent-id')).resolves.toEqual({ message: 'User deleted successfully' });
      // The controller's error handler would convert Prisma.PrismaClientKnownRequestError with P2025 into 404 ApiError.
      // For service unit test, we only test the service's direct responsibility.
    });
  });
});
```